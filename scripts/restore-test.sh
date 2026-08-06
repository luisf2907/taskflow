#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# Testa que o backup RESTAURA — num Postgres descartavel
# ═══════════════════════════════════════════════════════════════════════
# Backup nunca restaurado nao e backup, e esperanca. Este script fecha
# essa lacuna sem chegar perto da producao: sobe um container proprio,
# carrega o dump, conta as linhas e destroi tudo.
#
# NAO TOCA no banco de producao em momento nenhum.
#
# Uso:
#   ./restore-test.sh                      # usa o backup mais recente
#   ./restore-test.sh /root/backups/2026-08-06_180142
#   MANTER=1 ./restore-test.sh             # nao destroi o container ao fim
#
# Por que um Postgres cru nao basta: o dump foi tirado de um Supabase e
# carrega OWNER/GRANT para roles que so existem la (supabase_admin, anon,
# authenticated, ...), alem do tipo `vector` em perfis.voice_embedding.
# O script cria os roles e a extensao antes de restaurar. Num desastre de
# verdade voce restauraria num Supabase novo, que ja tem tudo isso — aqui
# recriamos o minimo para o teste ser fiel.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="${1:-}"
CONTAINER="${CONTAINER:-taskflow-restore-teste}"
IMAGEM="${IMAGEM:-pgvector/pgvector:pg15}"   # mesma major do Supabase self-hosted
MANTER="${MANTER:-0}"

log() { echo "[restore-test $(date +%H:%M:%S)] $*"; }
falhar() { echo "[restore-test ERRO] $*" >&2; exit 1; }

limpar() {
  if [ "$MANTER" = "1" ]; then
    log "container $CONTAINER mantido (MANTER=1). Remova com: docker rm -f $CONTAINER"
  else
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap limpar EXIT

# ───── Localiza o backup ─────
if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$(ls -td /root/backups/*/ 2>/dev/null | head -1 || true)"
  [ -n "$BACKUP_DIR" ] || falhar "nenhum backup em /root/backups — passe o diretorio como argumento"
fi
DUMP="$BACKUP_DIR/database.sql.gz"
[ -f "$DUMP" ] || falhar "nao achei $DUMP"
log "testando: $DUMP ($(du -h "$DUMP" | cut -f1))"

# ───── Integridade antes de qualquer coisa ─────
if [ -f "$BACKUP_DIR/SHA256SUMS" ]; then
  ( cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS >/dev/null ) \
    || falhar "SHA256SUMS nao confere — o arquivo corrompeu"
  log "checksums conferem"
fi
gzip -t "$DUMP" || falhar "gzip corrompido"

# ───── Postgres descartavel ─────
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
log "subindo $IMAGEM..."
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=teste "$IMAGEM" >/dev/null

for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres -q || falhar "Postgres nao subiu"

# ───── Pre-requisitos que o Supabase tem e um Postgres cru nao ─────
docker exec -i "$CONTAINER" psql -U postgres -q <<'SQL'
CREATE ROLE supabase_admin SUPERUSER LOGIN;
CREATE ROLE supabase_auth_admin NOINHERIT LOGIN;
CREATE ROLE supabase_storage_admin NOINHERIT LOGIN;
CREATE ROLE authenticator NOINHERIT LOGIN;
CREATE ROLE anon NOINHERIT;
CREATE ROLE authenticated NOINHERIT;
CREATE ROLE service_role NOINHERIT BYPASSRLS;
CREATE ROLE dashboard_user;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
log "roles e extensoes criados"

# ───── Restore ─────
# ON_ERROR_STOP fica DESLIGADO: sobra ruido de ownership/grant que nao
# afeta o dado. O que importa e a contagem de linhas no fim — e por isso
# os erros sao contados, nao ignorados em silencio.
log "restaurando..."
erros=$(gunzip -c "$DUMP" \
  | docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=0 2>&1 \
  | grep -c '^ERROR' || true)
log "restore concluido ($erros mensagens de ERROR)"

# ───── O que interessa: o dado voltou? ─────
echo
docker exec "$CONTAINER" psql -U postgres -d postgres -c "
SELECT
  (SELECT count(*) FROM auth.users)        AS usuarios,
  (SELECT count(*) FROM public.workspaces) AS workspaces,
  (SELECT count(*) FROM public.quadros)    AS quadros,
  (SELECT count(*) FROM public.cartoes)    AS cartoes,
  (SELECT count(*) FROM public.comentarios) AS comentarios,
  (SELECT count(*) FROM storage.objects)   AS arquivos;
"
echo
log "compare com a producao. Batendo, o backup presta."
