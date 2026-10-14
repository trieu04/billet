FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
RUN pnpm install --frozen-lockfile --filter @billet/mobile...
COPY apps/mobile apps/mobile
RUN pnpm deploy --filter @billet/mobile --prod /prod/mobile

FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S expo -G nodejs && mkdir -p /app/.expo && chown expo:nodejs /app/.expo
COPY --from=build --chown=expo:nodejs /prod/mobile ./
USER expo
EXPOSE 6702
CMD ["./node_modules/.bin/expo", "start", "--no-dev", "--minify", "--host", "lan", "--port", "6702"]
