# Billet — a simple Locket-style photo sharing app

Friends share photos with each other and see them in an in-app feed. This is the
**Core MVP**: sign in → add friends → take/pick a photo with a caption → see your
friends' photos in a feed. (No home-screen widget yet — that's future work.)

```
billet/
├── server/            # Node + Express + TypeScript + Prisma (Postgres) API
├── mobile/            # Expo (React Native) app — expo-router + TypeScript
├── web/               # Vite + React + TypeScript web app (same API)
└── docker-compose.yml # Local Postgres (host port 5433)
```

Mobile and web are two clients over one backend — accounts, friends, and photos are
shared, so you can post on your phone and see it on the web (and vice-versa).

## Prerequisites
- Node 18+ and npm
- Docker (for local Postgres), or your own Postgres instance
- The [Expo Go](https://expo.dev/go) app on a phone, or an Android/iOS emulator

## 1. Start the database
```bash
docker compose up -d          # Postgres on localhost:5433 (user/pass/db = locket)
```

## 2. Run the backend
```bash
cd server
cp .env.example .env          # DATABASE_URL points at localhost:5433 by default
npm install
npm run migrate               # apply Prisma migrations
npm run dev                   # API on http://localhost:4000
```

Quick check: `curl http://localhost:4000/health` → `{"ok":true}`

## 3. Run the mobile app
The phone must reach the backend over your LAN, so the API URL uses your machine's
LAN IP (not `localhost`).

```bash
cd mobile
npm install
# Set the API URL to your machine's LAN IP (default baked into src/config.ts).
# Override if needed: create .env with EXPO_PUBLIC_API_URL=http://<your-ip>:4000
npx expo start
```
Scan the QR code with Expo Go (or press `a`/`i` for an emulator).

> Find your LAN IP with `ip addr` (Linux) / `ipconfig getifaddr en0` (macOS).
> Android emulator can use `http://10.0.2.2:4000`.

## 4. Run the web app
```bash
cd web
npm install
npm run dev                   # Vite dev server on http://localhost:5173
```
The web app defaults to the API at `http://localhost:4000`. Override with a `.env`
containing `VITE_API_URL=http://<host>:4000` if the backend runs elsewhere. Build for
production with `npm run build` (output in `web/dist/`).

## Try it
1. Register two accounts (two devices/browsers, or one device + a reinstall).
2. On the **Friends** tab, search the other username and send a request; accept it
   from the other account.
3. On the **Send** tab, pick/take a photo, add a caption, send.
4. It appears in both accounts' **Feed** (pull to refresh on mobile / Refresh on web).
   Because both clients share the backend, a photo sent on mobile shows up on web too.

## API summary
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create account → `{ user, token }` |
| POST | `/auth/login` | Log in → `{ user, token }` |
| GET | `/auth/me` | Current user |
| GET | `/users/search?q=` | Find users by username |
| POST | `/friends/request` | Send friend request |
| GET | `/friends/requests` | Incoming pending requests |
| POST | `/friends/respond` | Accept / decline a request |
| GET | `/friends` | Accepted friends |
| POST | `/posts` | Create photo post (multipart `image` + `caption`) |
| GET | `/posts/feed` | Feed: your + friends' posts, newest first |

All routes except register/login require `Authorization: Bearer <token>`.

## Notes
- Photos are stored on the backend's local disk (`server/uploads/`) and served at
  `/uploads/*`. Swap for S3/object storage in production.
- Auth is email + password with JWT (30-day tokens). No OAuth in the MVP.
- See [`docs/system-architecture.md`](docs/system-architecture.md) for the design.
