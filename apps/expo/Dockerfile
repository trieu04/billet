FROM node:22-alpine

ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
WORKDIR /app
RUN corepack enable && addgroup -S nodejs && adduser -S expo -G nodejs
COPY apps/expo/package.json apps/expo/pnpm-lock.yaml apps/expo/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=expo:nodejs apps/expo ./
RUN mkdir -p /app/.expo && chown expo:nodejs /app/.expo
USER expo
EXPOSE 6703
CMD ["sh", "-c", "REACT_NATIVE_PACKAGER_HOSTNAME=\"${EXPO_PACKAGER_HOSTNAME:-localhost}\" exec ./node_modules/.bin/expo start --no-dev --minify --host lan --port 6703"]
