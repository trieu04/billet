FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/expo/package.json apps/expo/package.json
RUN pnpm install --frozen-lockfile --filter @billet/expo...
COPY apps/expo apps/expo
RUN pnpm deploy --filter @billet/expo /prod/expo

FROM node:22-alpine AS production
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S expo -G nodejs && mkdir -p /app/.expo && chown expo:nodejs /app /app/.expo
COPY --from=build --chown=expo:nodejs /prod/expo ./
USER expo
EXPOSE 6703
CMD ["sh", "-c", "REACT_NATIVE_PACKAGER_HOSTNAME=\"${EXPO_PACKAGER_HOSTNAME:-localhost}\" exec ./node_modules/.bin/expo start --no-dev --minify --host lan --port 6703"]
