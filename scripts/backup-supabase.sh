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

# Aceita volume nomeado OU caminho no host. O Coolify usa bind mount, entao
# costuma ser um caminho tipo:
#   /data/coolify/services/<uuid>/volumes/storage
# Descubra com:
#   docker inspect <container-do-storage> \
#     --format '{{range .Mounts}}{{.Type}} {{.Name}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
STORAGE_ORIGEM="${STORAGE_ORIGEM:-${MINIO_VOLUME:-}}"

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

[ -n "$STORAGE_ORIGEM" ] || falhar "STORAGE_ORIGEM nao configurado (volume nomeado ou caminho no host)"
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || falhar "container $DB_CONTAINER nao existe"
command -v rclone >/dev/null || falhar "rclone nao instalado"

# Um caminho absoluto e bind mount; o resto e nome de volume.
if [ "${STORAGE_ORIGEM:0:1}" = "/" ]; then
  STORAGE_TIPO="bind"
  [ -d "$STORAGE_ORIGEM" ] || falhar "diretorio $STORAGE_ORIGEM nao existe"
else
  STORAGE_TIPO="volume"
  docker volume inspect "$STORAGE_ORIGEM" >/dev/null 2>&1 || falhar "volume $STORAGE_ORIGEM nao existe"
fi

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

# ───── 2. Storage ─────
log "snapshot do storage ($STORAGE_TIPO)..."
if [ "$STORAGE_TIPO" = "bind" ]; then
  # Bind mount: o diretorio ja esta no host, nao precisa de container.
  tar czf "$dir/storage.tar.gz" -C "$STORAGE_ORIGEM" .
else
  # Volume nomeado: so acessivel de dentro do Docker.
  docker run --rm \
    -v "$STORAGE_ORIGEM":/data:ro \
    -v "$dir":/saida \
    alpine:3.19 tar czf /saida/storage.tar.gz -C /data .
fi

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

# Apaga os arquivos velhos, depois as pastas que ficaram vazias.
#
# Em passos separados de proposito: `delete --rmdirs` tenta remover TODA
# pasta ao final, inclusive a que acabou de ser enviada, e falha com
# "directory not empty" — tres ERROR por execucao, toda noite. Log que
# sempre tem erro e log que ninguem le.
#
# `rmdirs --leave-root` so remove pasta vazia, sem reclamar das cheias.
rclone delete "$REMOTO" --min-age "${DIAS_REMOTO}d" || true
rclone rmdirs "$REMOTO" --leave-root || true

log "concluido"
