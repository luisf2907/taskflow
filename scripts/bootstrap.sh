#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════
# bootstrap.sh — Aplica o bootstrap.sql no Postgres
# ═══════════════════════════════════════════════════════════════════════
# Rodado pelo container one-shot "bootstrap" do docker-compose.
# Aguarda postgres + GoTrue estarem prontos (schema auth + tabela users
# criados), depois aplica o SQL.
#
# Schemas 'auth' e 'storage' ja sao pre-criados pelo postgres-init/01-init.sql.
# GoTrue na primeira subida roda suas migrations e cria auth.users,
# auth.identities, etc. Este script espera auth.users existir antes de
# aplicar o bootstrap.sql, que tem FKs pra ela.
#
# Idempotente: o bootstrap.sql usa IF NOT EXISTS / OR REPLACE / DROP
# POLICY IF EXISTS. Re-executar nao quebra dados.
# ═══════════════════════════════════════════════════════════════════════

set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-taskflow}"
MAX_WAIT="${MAX_WAIT:-60}"  # tentativas, 2s cada = 2 min default

log() {
  echo "[bootstrap] $1"
}

log "Aguardando Postgres em ${PGHOST}:${PGPORT}..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; do
  sleep 1
done
log "Postgres pronto."

# ───── Espera GoTrue criar auth.users ─────
# FKs do bootstrap.sql (ex: github_tokens.user_id → auth.users.id) exigem
# que a tabela ja exista. GoTrue cria isso nas migrations da primeira
# subida. Esperamos ate ~2 min.
log "Aguardando GoTrue migrar (tabela auth.users)..."
for i in $(seq 1 "$MAX_WAIT"); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
     "SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users';" \
     2>/dev/null | grep -q 1; then
    log "✓ auth.users existe."
    break
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    log "ERRO: GoTrue nao criou auth.users em $((MAX_WAIT * 2))s."
    log "Cheque logs do gotrue: docker compose logs gotrue"
    exit 2
  fi
  if [ "$((i % 10))" -eq 0 ]; then
    log "... ainda esperando GoTrue (tentativa $i/$MAX_WAIT)"
  fi
  sleep 2
done

# ───── Skip se schema ja aplicado ─────
# bootstrap.sql tem CREATE INDEX e ADD CONSTRAINT sem IF NOT EXISTS (60
# indexes + 97 constraints vindos do dump). Em vez de tornar cada
# statement idempotente, checamos um marcador bem conhecido — se a
# tabela public.workspaces existir, o bootstrap ja rodou com sucesso
# antes.
log "Checando se schema ja foi aplicado..."
ALREADY=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspaces';" \
    2>/dev/null || echo "")

if [ "$ALREADY" = "1" ]; then
    log "✓ Schema base ja aplicado anteriormente."

    # Ainda assim, re-aplica objetos que sao idempotentes e podem ter
    # sido adicionados em versoes posteriores (triggers realtime, policies
    # adicionadas em migrations pos-bootstrap, RPCs, etc). Seguro — tudo
    # aqui usa CREATE OR REPLACE / DROP IF EXISTS.
    log "Re-aplicando objetos idempotentes (triggers realtime, migrations)..."
    if [ -f /realtime-triggers.sql ]; then
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
             -v ON_ERROR_STOP=1 \
             -f /realtime-triggers.sql \
             > /dev/null
        log "  ✓ Triggers realtime atualizados."
    fi

    # Lista explicita de migrations seguras pra re-aplicar em upgrade.
    # Criterio: arquivo usa DROP IF EXISTS / CREATE OR REPLACE em tudo.
    # Adicione aqui quando uma migration nova couber nesse padrao.
    UPGRADE_MIGRATIONS="045_anexos_storage_policies.sql 046_perfis_must_change_password.sql"
    for mig in $UPGRADE_MIGRATIONS; do
        if [ -f "/migrations/$mig" ]; then
            psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                 -v ON_ERROR_STOP=1 \
                 -f "/migrations/$mig" \
                 > /dev/null
            log "  ✓ Migration $mig aplicada."
        fi
    done

    log "  Pra re-aplicar schema completo: docker compose down -v (DESTROY)"
    exit 0
fi

log "Aplicando bootstrap.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
     -v ON_ERROR_STOP=1 \
     -f /bootstrap.sql

log "✓ Schema aplicado com sucesso."
log "Proximo passo: criar usuario admin com"
log "  docker compose exec app npx taskflow bootstrap"
log "(CLI disponivel na Fase 2 do plano; por hora, criacao de user e manual)"
