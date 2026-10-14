import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import WebSocket, { WebSocketServer } from 'ws'
import { realtimeConfig, type RealtimeConfig } from '../../../configs/app.config'
import { RealtimeService } from './realtime.service'

const HEARTBEAT_INTERVAL_MS = 30_000
const MAX_CONNECTIONS = 1_000
const MAX_PAYLOAD_BYTES = 64 * 1024

@Injectable()
export class RealtimeServerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeServerService.name)
  private readonly alive = new WeakSet<WebSocket>()
  private webSocketServer?: WebSocketServer
  private httpServer?: Server
  private heartbeat?: NodeJS.Timeout

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly realtime: RealtimeService,
    @Inject(realtimeConfig.KEY) private readonly config: RealtimeConfig,
  ) {}

  onApplicationBootstrap(): void {
    this.httpServer = this.adapterHost.httpAdapter.getHttpServer() as Server
    this.webSocketServer = new WebSocketServer({
      noServer: true,
      maxPayload: MAX_PAYLOAD_BYTES,
      perMessageDeflate: false,
    })
    this.httpServer.on('upgrade', this.handleUpgrade)
    this.heartbeat = setInterval(() => this.runHeartbeat(), HEARTBEAT_INTERVAL_MS)
    this.heartbeat.unref()
    this.logger.log(`Realtime WebSocket listening on ${this.config.path}`)
  }

  onApplicationShutdown(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.httpServer?.off('upgrade', this.handleUpgrade)
    for (const socket of this.webSocketServer?.clients ?? []) socket.terminate()
    this.webSocketServer?.close()
  }

  private readonly handleUpgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void => {
    if (
      request.url !== this.config.path ||
      !this.isOriginAllowed(request) ||
      (this.webSocketServer?.clients.size ?? 0) >= MAX_CONNECTIONS
    ) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }

    this.webSocketServer?.handleUpgrade(request, socket, head, (webSocket) => {
      this.alive.add(webSocket)
      webSocket.on('pong', () => this.alive.add(webSocket))
      this.realtime.attach(webSocket)
    })
  }

  private isOriginAllowed(request: IncomingMessage): boolean {
    const origin = request.headers.origin
    if (!origin) return true
    if (this.config.allowedOrigins.includes(origin)) return true
    if (this.config.allowedOrigins.length > 0) return false
    try {
      return new URL(origin).host === request.headers.host
    } catch {
      return false
    }
  }

  private runHeartbeat(): void {
    for (const socket of this.webSocketServer?.clients ?? []) {
      if (!this.alive.has(socket)) {
        socket.terminate()
        continue
      }
      this.alive.delete(socket)
      socket.ping()
    }
    void this.realtime.revalidate()
  }
}
