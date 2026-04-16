# syntax=docker/dockerfile:1.6
# ═══════════════════════════════════════════════════════════════════════
# Taskflow Next.js — build standalone para self-hosted
# ═══════════════════════════════════════════════════════════════════════
# Multi-stage:
#   1. deps    — instala node_modules de producao
#   2. builder — compila Next.js com output: "standalone"
#   3. runner  — imagem final minima (Alpine + node + bundle)
#
# Tamanho final: ~200MB (Alpine base + Next standalone)
#
# Build:
#   docker build -f docker/Dockerfile.app \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000 \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-jwt \
#     -t taskflow-app .
#
# IMPORTANTE: NEXT_PUBLIC_* precisam estar disponiveis em build time
# porque o Next.js inlina no bundle do cliente. Mudar essas envs requer
# rebuild da imagem.
# ═══════════════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
# ──────────────────────────────────────────────────────────────────────
WORKDIR /app
# libc6-compat: necessario pra alguns pacotes nativos (sharp, etc)
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
# ──────────────────────────────────────────────────────────────────────
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args: envs publicas que o Next.js inlina no bundle do cliente.
# Defaults sao placeholders pra build funcionar em CI; override via
# docker-compose com valores reais.
ARG NEXT_PUBLIC_SUPABASE_URL=http://placeholder.local
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_REALTIME_DRIVER=supabase
ARG NEXT_PUBLIC_VCS_TOKEN_MODE=oauth
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_REALTIME_DRIVER=$NEXT_PUBLIC_REALTIME_DRIVER
ENV NEXT_PUBLIC_VCS_TOKEN_MODE=$NEXT_PUBLIC_VCS_TOKEN_MODE
ENV NEXT_TELEMETRY_DISABLED=1

# ENCRYPTION_KEY e validada em runtime, mas o build valida envs em alguns
# code paths. Usar placeholder valido (64 hex chars) so pra passar o build.
ENV ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENV SUPABASE_SERVICE_ROLE_KEY=build-placeholder

RUN npm run build

# ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
# ──────────────────────────────────────────────────────────────────────
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario nao-root
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

# Copia apenas o output standalone (inclui node_modules necessarios)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Volume pra storage local (se STORAGE_DRIVER=local-disk)
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage
VOLUME /app/storage

USER nextjs
EXPOSE 3000

# Healthcheck usa /api/health (a ser criado em Fase 2)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
