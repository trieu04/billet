FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @billet/web...
COPY apps/web apps/web
RUN --mount=type=secret,id=web_env,target=/app/apps/web/.env,required=true \
    pnpm --filter @billet/web build

FROM nginx:1.29-alpine AS production
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 6702
CMD ["nginx", "-g", "daemon off;"]
