#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# Backup do Taskflow rodando sobre Supabase self-hosted (Coolify)
# ═══════════════════════════════════════════════════════════════════════
# Autonomo de proposito: so bash + docker + rclone. Nao precisa do repo
# nem do Node na VPS — foi escrito para ser copiado solto para o servidor.
#
# (Se voce TEM o repo na maquina, `scripts/cli.mjs backup --db-user
# supabase_admin --db-name postgres` faz o equivalente com manifest.json.)
#
# O que entra:
#   1. Postgres — schemas public, auth e storage
#   2. Volume do MinIO — os arquivos em si
#
# Os dois sao inseparaveis: o dump traz as LINHAS de storage.objects, e o
# tar traz os BYTES. Restaurar so um deixa anexos apontando pro vazio.
#
# Por que nao o banco inteiro: o Supabase cria _realtime, _analytics,
# extensions, graphql, pgbouncer, vault e outros que uma instalacao nova
# recria sozinha. Restaurar por cima gera conflito sem trazer dado seu.
#
# Instalacao:
#   1. Ajuste as variaveis do bloco CONFIG
#   2. chmod +x backup-supabase.sh
#   3. Teste rodando na mao uma vez
#   4. crontab -e:
#      0 3 * * * /root/backup-supabase.sh >> /var/log/taskflow-backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ───── CONFIG ─────
DB_CONTAINER="${DB_CONTAINER:-supabase-db-hb0kltydxevy8udmd48r11g3}"
MINIO_VOLUME="${MINIO_VOLUME:-}"          # descubra com: docker volume ls | grep -i minio
DB_USER="${DB_USER:-supabase_admin}"      # NAO use "postgres": no Supabase ele nao e superusuario
DB_NAME="${DB_NAME:-postgres}"
DESTINO_LOCAL="${DESTINO_LOCAL:-/root/backups}"
REMOTO="${REMOTO:-gdrive:taskflow-backups}"
DIAS_LOCAL="${DIAS_LOCAL:-7}"
DIAS_REMOTO="${DIAS_REMOTO:-30}"

# ───────────────────────────────────────────────────────────────────────
carimbo="$(date +%Y-%m-%d_%H%M%S)"
dir="$DESTINO_LOCAL/$carimbo"

log() { echo "[backup $(date +%H:%M:%S)] $*"; }
falhar() { echo "[backup ERRO] $*" >&2; exit 1; }

[ -n "$MINIO_VOLUME" ] || falhar "MINIO_VOLUME nao configurado. Rode: docker volume ls | grep -i minio"
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || falhar "container $DB_CONTAINER nao existe"
docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1 || falhar "volume $MINIO_VOLUME nao existe"
command -v rclone >/dev/null || falhar "rclone nao instalado"

mkdir -p "$dir"
log "destino: $dir"

# ───── 1. Postgres ─────
log "dump do banco..."
docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" -d "$DB_NAME" \
  -n public -n auth -n storage \
  --clean --if-exists --quote-all-identifiers \
  | gzip -9 > "$dir/database.sql.gz"

# pg_dump falhando no meio de um pipe ainda gera arquivo — pequeno demais
# e o sinal de que nao vale nada.
tam_db=$(stat -c%s "$dir/database.sql.gz")
[ "$tam_db" -gt 10240 ] || falhar "dump com apenas ${tam_db} bytes — algo deu errado"
log "banco: $(numfmt --to=iec "$tam_db")"

# ───── 2. Storage (MinIO) ─────
log "snapshot do storage..."
docker run --rm \
  -v "$MINIO_VOLUME":/data:ro \
  -v "$dir":/saida \
  alpine:3.19 tar czf /saida/storage.tar.gz -C /data .

tam_st=$(stat -c%s "$dir/storage.tar.gz")
log "storage: $(numfmt --to=iec "$tam_st")"

# ───── 3. Integridade ─────
( cd "$dir" && sha256sum ./*.gz > SHA256SUMS )

# ───── 4. Copia fora da VPS ─────
log "enviando para $REMOTO..."
rclone copy "$dir" "$REMOTO/$carimbo" --transfers 2 --retries 3

# Confere que chegou, em vez de confiar no exit code.
enviados=$(rclone lsf "$REMOTO/$carimbo" | wc -l)
[ "$enviados" -ge 3 ] || falhar "so $enviados arquivos no remoto (esperado 3)"
log "confirmado no remoto: $enviados arquivos"

# ───── 5. Retencao ─────
find "$DESTINO_LOCAL" -maxdepth 1 -type d -name '20*' -mtime "+$DIAS_LOCAL" -exec rm -rf {} + || true
rclone delete "$REMOTO" --min-age "${DIAS_REMOTO}d" --rmdirs || true

log "concluido"
