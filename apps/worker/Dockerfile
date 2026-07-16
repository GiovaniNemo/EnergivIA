# Worker — multi-stage build dedicado.
# Não usa o Dockerfile raiz porque aquele constrói só a API.

# ============================================================================
# Stage 1 — builder
# ============================================================================
# Base: node:20-slim (Debian) em vez de alpine porque puppeteer precisa de
# várias libs nativas (libnss, libatk, libcups, etc) que vêm muito mais
# fáceis no Debian. Alpine forçaria install manual + path do Chromium.
FROM node:20-slim AS worker-builder

WORKDIR /app

# pnpm via corepack — mesma versão usada no resto do monorepo.
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Manifests + lockfile primeiro pra aproveitar cache do Docker.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps ./apps
COPY packages ./packages

# Install tudo (devDependencies inclusas — precisa do tsc/prisma pra build).
RUN pnpm install --frozen-lockfile

# Packages compartilhados que o worker importa.
RUN pnpm run build --filter=@energivia/types --filter=@energivia/utils \
  --filter=@energivia/shared-types --filter=@energivia/solar-engine

# Prisma client (worker faz query direto no DB).
RUN pnpm run db:generate --filter=@energivia/api

# Worker em si (compila TS → JS em dist/).
RUN pnpm run build --filter=@energivia/worker

# ============================================================================
# Stage 2 — runtime
# ============================================================================
# Imagem final: copia o output do builder. Mantém deps de produção pra
# não trazer tooling de build pra prod.
FROM node:20-slim AS worker-runtime

WORKDIR /app
ENV NODE_ENV=production

# Libs nativas que puppeteer precisa pra rodar headless Chrome.
# Sem isso, dá erro "error while loading shared libraries: libnss3.so".
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Copia o build artifact e node_modules do builder.
COPY --from=worker-builder /app ./

WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
