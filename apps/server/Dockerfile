FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile --filter @billet/server...
COPY apps/server apps/server
RUN pnpm --filter @billet/server build && pnpm deploy --filter @billet/server --prod /prod/server

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=build --chown=nestjs:nodejs /prod/server ./
USER nestjs
EXPOSE 6700
CMD ["node", "dist/main.js"]
