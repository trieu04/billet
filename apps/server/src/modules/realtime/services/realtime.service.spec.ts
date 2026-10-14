import { UnauthorizedException } from '@nestjs/common'
import { once } from 'node:events'
import WebSocket, { WebSocketServer } from 'ws'
import type { RealtimeAuthService } from './auth.service'
import { RealtimeService } from './realtime.service'

describe('RealtimeService', () => {
  let server: WebSocketServer
  let service: RealtimeService
  const auth = {
    authenticate: jest.fn(async (token: string) => {
      if (token === 'token-a') return { id: '1', email: 'a@example.com' }
      if (token === 'token-b') return { id: '2', email: 'b@example.com' }
      throw new UnauthorizedException()
    }),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    service = new RealtimeService(auth as unknown as RealtimeAuthService)
    server = new WebSocketServer({ port: 0 })
    server.on('connection', (socket) => service.attach(socket))
    await once(server, 'listening')
  })

  afterEach(async () => {
    for (const client of server.clients) client.terminate()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('publishes events only to sessions authenticated as the target user', async () => {
    const socket = await connect(server)
    socket.send(JSON.stringify({ id: 'auth-1', type: 'auth', data: { token: 'token-a' } }))
    await expect(nextFrame(socket)).resolves.toMatchObject({
      id: 'auth-1',
      type: 'ack',
      data: { userId: '1' },
    })

    await service.publish('2', 'notification.created', { notificationId: 'hidden' })
    await expect(noFrame(socket)).resolves.toBe(true)

    const received = nextFrame(socket)
    await service.publish('1', 'notification.created', { notificationId: 'visible' })
    await expect(received).resolves.toMatchObject({
      type: 'notification.created',
      data: { notificationId: 'visible' },
    })
    socket.close()
  })

  it('rejects invalid authentication without exposing details', async () => {
    const socket = await connect(server)
    socket.send(JSON.stringify({ id: 'auth-2', type: 'auth', data: { token: 'invalid' } }))

    await expect(nextFrame(socket)).resolves.toMatchObject({
      id: 'auth-2',
      type: 'error',
      error: { statusCode: 401 },
    })
    const [code] = (await once(socket, 'close')) as [number, Buffer]
    expect(code).toBe(4401)
  })
})

async function connect(server: WebSocketServer): Promise<WebSocket> {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server address')
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}`)
  await once(socket, 'open')
  return socket
}

async function nextFrame(socket: WebSocket): Promise<Record<string, unknown>> {
  const [data] = (await once(socket, 'message')) as [WebSocket.RawData, boolean]
  return JSON.parse(data.toString()) as Record<string, unknown>
}

async function noFrame(socket: WebSocket): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage)
      resolve(true)
    }, 50)
    const onMessage = (): void => {
      clearTimeout(timeout)
      reject(new Error('Unexpected realtime frame'))
    }
    socket.once('message', onMessage)
  })
}
