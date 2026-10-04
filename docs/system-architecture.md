# System Architecture — Billet (Core MVP)

## Overview
A multi-client system: an Expo mobile app and a Vite/React web app both talk to one
stateless REST API backed by Postgres. Photos are uploaded to the server, stored on
disk, and served statically; clients render feeds by URL.

```
┌──────────────┐
│  Expo app    │─┐
│ (mobile/)    │ │  HTTPS/JSON + JWT    ┌─────────────────────┐        ┌────────────┐
└──────────────┘ ├───────────────────▶ │  Express API        │ ─────▶ │ PostgreSQL │
┌──────────────┐ │ ◀─────────────────── │  (server/)          │ ◀───── │            │
│  Web app     │─┘  multipart upload    │  + /uploads static  │        └────────────┘
│ (web/)       │                        └─────────────────────┘
└──────────────┘                                 │ disk: server/uploads/
        ▲   <img src=…/uploads/x.jpg>            │
        └───────────────────────────────────────┘
```

## Backend (`server/`)
Express + TypeScript, Prisma ORM over Postgres. Each file is single-purpose.

- `src/index.ts` — app bootstrap: CORS, JSON, static `/uploads`, route mounting, error handler.
- `src/db.ts` — shared Prisma client.
- `src/lib/jwt.ts` — sign/verify JWT (30-day expiry).
- `src/lib/upload.ts` — multer disk storage; images only, 10 MB cap; UUID filenames.
- `src/lib/user-view.ts` — `toPublicUser()` strips `passwordHash` from responses.
- `src/middleware/auth.ts` — validates `Bearer` token → `req.userId`.
- `src/routes/auth.ts` — register / login / me (bcrypt password hashing).
- `src/routes/users.ts` — user search (excludes self).
- `src/routes/friends.ts` — request / requests / respond / list.
- `src/routes/posts.ts` — create post + feed query.

### Data model
- **User** (id, username·unique, email·unique, passwordHash, displayName, createdAt)
- **Friendship** (requesterId, addresseeId, status: pending|accepted) — one row per
  pair, unique on (requester, addressee). Friendship is symmetric: the feed and
  friend list treat either direction the same.
- **Post** (authorId, imageUrl, caption?, createdAt), indexed by (authorId, createdAt).

### Feed logic
`feedAuthorIds(me)` = the caller + every accepted-friend id (either direction);
`GET /posts/feed` returns posts by those authors, newest first, capped at 100.

## Mobile (`mobile/`)
Expo + expo-router (file-based routing) + TypeScript.

- `app/_layout.tsx` — `AuthProvider` + `AuthGate` redirect between `(auth)`/`(tabs)`.
- `app/(auth)/` — `login`, `register`.
- `app/(tabs)/` — `index` (Feed), `camera` (Send), `friends`.
- `src/config.ts` — API base URL (`EXPO_PUBLIC_API_URL` override).
- `src/api/client.ts` — axios instance; in-module token injected via interceptor.
- `src/api/endpoints.ts` — typed API calls + `User`/`Post` types.
- `src/auth/auth-context.tsx` — session state; JWT persisted in `expo-secure-store`.
- `src/components/` — `ui` (Screen/TextField/PrimaryButton), `post-card`.
- `src/theme.ts` — shared colors/spacing/radius tokens.

### Auth flow
On launch, `AuthProvider` reads the token from SecureStore, sets it on the axios
instance, and calls `/auth/me`. `AuthGate` routes to `(auth)` when signed out and
`(tabs)` when signed in. Login/register persist `{ token, user }` and flip state.

### Image upload
`createPost` builds a React-Native `FormData` with `{ uri, name, type }` and POSTs
multipart to `/posts`. The server stores the file and returns an absolute
`imageUrl` (built from `PUBLIC_BASE_URL`) that the feed renders directly.

## Web (`web/`)
Vite + React + TypeScript SPA — a second client over the **same** REST API, so it
shares accounts, friends, and photos with the mobile app. CORS is already open on
the backend, so no server changes were needed.

- `src/main.tsx` — mounts `BrowserRouter` + `AuthProvider`.
- `src/App.tsx` — route table with an inline auth gate (signed-out users see only
  `/login` and `/register`; signed-in users get the `Layout` shell).
- `src/components/layout.tsx` — brand, tab nav (Feed/Send/Friends), sign-out.
- `src/pages/` — `login`, `register`, `feed`, `send` (file-input upload), `friends`.
- `src/api/client.ts` / `endpoints.ts` — axios instance + typed calls (mirrors mobile;
  `createPost` takes a browser `File`).
- `src/auth/auth-context.tsx` — session state; JWT persisted in `localStorage`.
- `src/config.ts` — API base URL (`VITE_API_URL` override, defaults to `localhost:4000`).
- `src/index.css` — shared dark theme (same palette tokens as mobile).

The auth model is identical to mobile: on load, the persisted token (localStorage) is
sent by the axios interceptor and validated via `/auth/me`; login/register store the
token and flip state. Photo upload uses a native `<input type="file">` and browser
`FormData`.

## Security notes (MVP scope)
- Passwords hashed with bcrypt; JWT signed with `JWT_SECRET` (set per environment).
- `toPublicUser` guarantees password hashes never leave the API.
- Uploads restricted to images ≤ 10 MB with server-generated filenames.
- Not yet hardened for production: no rate limiting, refresh tokens, HTTPS
  enforcement, image reprocessing, or object storage — see Future work.

## Future work
Home-screen widget (WidgetKit / Glance via a dev build), push notifications (FCM/
APNs), reactions/history, object storage (S3), and token refresh.
