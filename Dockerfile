# Multi-stage: API
FROM node:20-alpine AS api-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@energivia/types --filter=@energivia/utils --filter=@energivia/shared-types --filter=@energivia/solar-engine
RUN pnpm run db:generate --filter=@energivia/api
RUN pnpm run build --filter=@energivia/api

FROM node:20-alpine AS api-runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-builder /app ./
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
