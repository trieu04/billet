# Realtime WebSocket

Billet exposes a raw WebSocket endpoint at `/ws` by default. It shares the NestJS
HTTP server and does not use the REST `/api/v1` prefix.

The first client frame must arrive within five seconds and authenticate with the
same access token used by REST:

```json
{ "id": "auth-1", "type": "auth", "data": { "token": "<access token>" } }
```

The server responds with an acknowledgement:

```json
{ "id": "auth-1", "type": "ack", "data": { "userId": "<user bigint string>" } }
```

Feature modules inject `RealtimeService` and call
`publish(userId, eventType, responseSafePayload)` after committing state. They may
also register validated client commands with `register()`. Never publish entities,
credentials, message bodies containing secrets, or data the receiving user has not
been authorized to read.

Notification events currently act as invalidations:

- `notification.created`: `{ notificationId }`
- `notification.read`: `{ notificationId, readAt }`
- `notification.read-all`: `{ updatedCount }`
- `notification.deleted`: `{ notificationId }`

Clients should reload protected data through REST after reconnecting. Delivery is
best effort within one server process; there is no replay or cross-instance broker.
Add Redis pub/sub or another broker behind `RealtimeService` before horizontally
scaling the API.

Operational limits: 64 KiB frames, 1,000 process-wide connections, five connections
per user, 60 frames/minute/socket, four in-flight commands, and a 1 MB outgoing
buffer. The server pings every 30 seconds and terminates clients that stop replying.
Configure `WS_ALLOWED_ORIGINS` for browser clients; native clients without an Origin
header must still authenticate.
