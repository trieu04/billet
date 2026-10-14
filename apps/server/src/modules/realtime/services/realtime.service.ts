import {
  BadRequestException,
  HttpException,
  Injectable,
  type Type,
  ValidationPipe,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import type { AuthUser } from '../../auth/interface'
import { RealtimeAuthService } from './auth.service'

const AUTH_TIMEOUT_MS = 5_000
const MAX_CONNECTIONS_PER_USER = 5
const MAX_IN_FLIGHT_REQUESTS = 4
const MAX_FRAMES_PER_MINUTE = 60
const MAX_SEND_BUFFER_BYTES = 1_000_000

interface RealtimeSession {
  token?: string
  user?: AuthUser
  authenticating: boolean
  activeRequests: Set<string>
  frameCount: number
  frameWindowStartedAt: number
  abortController: AbortController
}

export interface RealtimeContext {
  user: AuthUser
  signal: AbortSignal
}

type RealtimeHandler = (data: unknown, context: RealtimeContext) => Promise<unknown>

interface ClientFrame {
  id: string
  type: string
  data?: unknown
}

@Injectable()
export class RealtimeService {
  private readonly sessions = new Map<WebSocket, RealtimeSession>()
  private readonly handlers = new Map<string, RealtimeHandler>()
  private readonly validation = new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  })

  constructor(private readonly auth: RealtimeAuthService) {}

  register<T>(
    type: string,
    dto: Type<T>,
    handler: (data: T, context: RealtimeContext) => Promise<unknown>,
  ): void {
    if (!type || type === 'auth' || this.handlers.has(type)) {
      throw new Error(`Invalid or duplicate realtime handler: ${type}`)
    }
    this.handlers.set(type, async (data, context) => {
      const value = await this.validation.transform(data, { type: 'body', metatype: dto })
      return handler(value, context)
    })
  }

  attach(socket: WebSocket): void {
    const session: RealtimeSession = {
      authenticating: false,
      activeRequests: new Set(),
      frameCount: 0,
      frameWindowStartedAt: Date.now(),
      abortController: new AbortController(),
    }
    this.sessions.set(socket, session)

    const authenticationTimeout = setTimeout(() => {
      if (!session.user) socket.close(4401, 'Authentication required')
    }, AUTH_TIMEOUT_MS)
    authenticationTimeout.unref()

    socket.on('error', () => socket.terminate())
    socket.on('close', () => {
      clearTimeout(authenticationTimeout)
      session.abortController.abort()
      this.sessions.delete(socket)
    })
    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        socket.close(1003, 'JSON text required')
        return
      }
      void this.receive(socket, session, data.toString())
    })
  }

  async publish(userId: string, type: string, data: unknown): Promise<void> {
    const event = { id: randomUUID(), type, data }
    await Promise.all(
      [...this.sessions].map(async ([socket, session]) => {
        if (session.user?.id !== userId || !session.token) return
        try {
          session.user = await this.auth.authenticate(session.token)
          this.send(socket, event)
        } catch {
          socket.close(4401, 'Authentication expired')
        }
      }),
    )
  }

  async revalidate(): Promise<void> {
    await Promise.all(
      [...this.sessions].map(async ([socket, session]) => {
        if (!session.token) return
        try {
          session.user = await this.auth.authenticate(session.token)
        } catch {
          socket.close(4401, 'Authentication expired')
        }
      }),
    )
  }

  private async receive(socket: WebSocket, session: RealtimeSession, raw: string): Promise<void> {
    let requestId: string | undefined
    let claimed = false
    try {
      this.enforceRateLimit(socket, session)
      const frame = this.parseFrame(raw)
      requestId = frame.id
      if (
        session.activeRequests.has(frame.id) ||
        session.activeRequests.size >= MAX_IN_FLIGHT_REQUESTS
      ) {
        throw new BadRequestException('Duplicate request or too many requests in flight')
      }
      session.activeRequests.add(frame.id)
      claimed = true

      if (!session.user) {
        await this.authenticate(socket, session, frame)
        return
      }

      if (!session.token) throw new BadRequestException('Authentication required')
      session.user = await this.auth.authenticate(session.token)
      const handler = this.handlers.get(frame.type)
      if (!handler) throw new BadRequestException('Unsupported realtime event')
      const result = await handler(frame.data, {
        user: session.user,
        signal: session.abortController.signal,
      })
      await this.auth.authenticate(session.token)
      this.send(socket, { id: frame.id, type: 'ack', data: result })
    } catch (error: unknown) {
      this.send(socket, {
        id: requestId,
        type: 'error',
        error: transportError(error),
      })
      if (error instanceof HttpException && error.getStatus() === 401) {
        socket.close(4401, 'Authentication expired')
      }
    } finally {
      if (claimed && requestId) session.activeRequests.delete(requestId)
    }
  }

  private async authenticate(
    socket: WebSocket,
    session: RealtimeSession,
    frame: ClientFrame,
  ): Promise<void> {
    const token = getAuthToken(frame)
    if (frame.type !== 'auth' || session.authenticating || !token) {
      socket.close(4401, 'Authentication required')
      return
    }
    session.authenticating = true
    try {
      const user = await this.auth.authenticate(token)
      const connectionCount = [...this.sessions.values()].filter(
        (candidate) => candidate.user?.id === user.id,
      ).length
      if (connectionCount >= MAX_CONNECTIONS_PER_USER) {
        socket.close(4429, 'Connection limit')
        return
      }
      session.token = token
      session.user = user
      this.send(socket, { id: frame.id, type: 'ack', data: { userId: user.id } })
    } finally {
      session.authenticating = false
    }
  }

  private parseFrame(raw: string): ClientFrame {
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      throw new BadRequestException('Invalid JSON')
    }
    if (
      typeof value !== 'object' ||
      value === null ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      value.id.length < 1 ||
      value.id.length > 100 ||
      !('type' in value) ||
      typeof value.type !== 'string' ||
      value.type.length < 1 ||
      value.type.length > 100
    ) {
      throw new BadRequestException('Realtime frame requires valid id and type')
    }
    return { id: value.id, type: value.type, data: 'data' in value ? value.data : undefined }
  }

  private enforceRateLimit(socket: WebSocket, session: RealtimeSession): void {
    if (Date.now() - session.frameWindowStartedAt >= 60_000) {
      session.frameWindowStartedAt = Date.now()
      session.frameCount = 0
    }
    session.frameCount += 1
    if (session.frameCount > MAX_FRAMES_PER_MINUTE) {
      socket.close(4429, 'Rate limit')
      throw new BadRequestException('Realtime rate limit exceeded')
    }
  }

  private send(socket: WebSocket, frame: object): void {
    if (socket.readyState !== WebSocket.OPEN) return
    if (socket.bufferedAmount > MAX_SEND_BUFFER_BYTES) {
      socket.close(1013, 'Slow consumer')
      return
    }
    socket.send(JSON.stringify(frame), (error) => {
      if (error) socket.terminate()
    })
  }
}

function getAuthToken(frame: ClientFrame): string | null {
  if (typeof frame.data !== 'object' || frame.data === null || !('token' in frame.data)) return null
  const token = frame.data.token
  return typeof token === 'string' && token.length > 0 && token.length <= 8_192 ? token : null
}

export function transportError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof HttpException) {
    return { statusCode: error.getStatus(), message: error.message }
  }
  return { statusCode: 500, message: 'Unable to process realtime request' }
}
