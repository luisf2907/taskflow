#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# gen-secrets.sh — Gera secrets seguros pro stack self-hosted
# ═══════════════════════════════════════════════════════════════════════
# Saida: variaveis de ambiente em formato KEY=VALUE, prontas pra serem
# concatenadas num .env.local.
#
# Uso:
#   bash scripts/gen-secrets.sh >> .env.local
#
# Ou pra testar sem escrever:
#   bash scripts/gen-secrets.sh
#
# Gera:
#   - POSTGRES_PASSWORD: senha do postgres (32 bytes hex)
#   - JWT_SECRET: segredo do GoTrue/PostgREST (32 bytes hex)
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY: JWT assinado com role "anon"
#   - SUPABASE_SERVICE_ROLE_KEY: JWT assinado com role "service_role"
#   - ENCRYPTION_KEY: AES-256 key (32 bytes hex)
#
# Dependencias: openssl (pra rand) e node (pra JWT signing)
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERRO: comando '$1' nao encontrado. Instale antes de rodar." >&2
    exit 1
  fi
}

require_cmd openssl
require_cmd node

# ───── Secrets aleatorios ─────
POSTGRES_PASSWORD="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"

# ───── JWTs assinados (anon e service_role) ─────
# Supabase usa HS256 com JWT_SECRET. Payload minimo: { role, iss, iat, exp }.
# Exp = 10 anos (JWT de chave API, nao de usuario).
sign_jwt() {
  local role="$1"
  local now exp
  now=$(date +%s)
  exp=$((now + 315360000))  # 10 anos

  node -e "
    const crypto = require('crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      role: '${role}',
      iss: 'supabase-local',
      iat: ${now},
      exp: ${exp},
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', '${JWT_SECRET}').update(header + '.' + payload).digest('base64url');
    console.log(header + '.' + payload + '.' + sig);
  "
}

ANON_KEY="$(sign_jwt anon)"
SERVICE_ROLE_KEY="$(sign_jwt service_role)"

# ───── Output ─────
cat <<EOF

# ═══════════════════════════════════════════════════════════════════════
# Secrets gerados em $(date -u +%Y-%m-%dT%H:%M:%SZ) por scripts/gen-secrets.sh
# NAO trocar depois de rodar o stack a primeira vez:
#   - ENCRYPTION_KEY: tokens ja encriptados (GitHub PATs, API keys) ficam
#     irrecuperaveis se mudar
#   - JWT_SECRET: invalida todas sessoes ativas, forca re-login de todos
# Se precisar rotacionar, use: docker compose exec app npx taskflow token:rotate
# ═══════════════════════════════════════════════════════════════════════

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF
