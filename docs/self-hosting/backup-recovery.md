# Backup e Recovery

## Visão geral

O CLI gera backups completos do instance com verificação de integridade:

- **Database:** `pg_dump` comprimido (`database.sql.gz`)
- **Storage:** tar do volume de uploads (`storage.tar.gz`) — se `STORAGE_DRIVER=local-disk`
- **Manifest:** `manifest.json` com SHA-256 de cada componente

## Criar backup

```bash
node --env-file=.env.local scripts/cli.mjs backup
```

Gera diretório em `./backups/taskflow-YYYYMMDD-HHMMSS/` com 3 arquivos.

### Opções

```bash
backup --out ./backups/custom-name   # destino custom
backup --db-only                     # só database (pula storage)
backup --storage-only                # só storage (pula database)
backup --postgres-container <name>   # default: taskflow-postgres
backup --storage-volume <name>       # default: taskflow-storage-data
```

### Manifest

```json
{
  "version": 1,
  "createdAt": "2026-04-16T12:34:56Z",
  "source": {
    "composeFile": "docker/docker-compose.solo.yml",
    "postgresContainer": "taskflow-postgres",
    "storageVolume": "taskflow-storage-data",
    "storageDriver": "local-disk"
  },
  "components": {
    "database": { "file": "database.sql.gz", "sha256": "...", "sizeBytes": 12345 },
    "storage":  { "file": "storage.tar.gz",  "sha256": "...", "sizeBytes": 6789 }
  }
}
```

## Restaurar backup

**⚠️ Operação destrutiva** — sobrescreve DB e volume de storage inteiro.

```bash
# 1. Dry-run (valida hashes, mostra o que será sobrescrito)
node --env-file=.env.local scripts/cli.mjs restore --from ./backups/taskflow-20260416-120000

# 2. Aplica
node --env-file=.env.local scripts/cli.mjs restore --from ./backups/taskflow-20260416-120000 --yes

# 3. Reinicia app pra limpar cache in-memory
docker restart taskflow-app
```

### Opções

```bash
restore --from <dir>     # diretório com manifest.json (obrigatório)
restore --yes            # pula confirmação destrutiva
restore --db-only        # restaura só database
restore --storage-only   # restaura só storage
```

### Verificação de integridade

O restore **valida SHA-256** de cada arquivo antes de tocar em qualquer
coisa. Se algum hash não bater (arquivo corrompido), aborta sem
modificar nada.

## Schedule recomendado

| Cenário | Frequência | Comando |
|---------|-----------|---------|
| Solo (1 pessoa) | Semanal | `backup` manual |
| Team (2-20) | Diário | Cron ou scheduled task |
| Full (produção) | Diário + antes de upgrades | Cron + backup antes de `docker compose pull` |

### Exemplo de cron (Linux)

```cron
# Backup diário às 3h da manhã
0 3 * * * cd /opt/taskflow && node --env-file=.env.local scripts/cli.mjs backup --out /backups/taskflow-$(date +\%Y\%m\%d) 2>&1 | tee -a /var/log/taskflow-backup.log
```

### Exemplo com Task Scheduler (Windows)

```powershell
# Criar tarefa agendada
schtasks /create /sc daily /st 03:00 /tn "Taskflow Backup" /tr "node --env-file=C:\taskflow\.env.local C:\taskflow\scripts\cli.mjs backup --out C:\backups\taskflow"
```

## Limitações

- **Storage S3 (MinIO):** backup do CLI só copia o volume `local-disk`.
  Se usar `STORAGE_DRIVER=s3-compat`, use as ferramentas nativas do MinIO
  (`mc mirror`) ou snapshots do volume `minio-data`.
- **Backup incremental:** não suportado (cada backup é full `pg_dump`).
  Pra databases grandes (>1GB), considere `pg_basebackup` + WAL archiving.
- **Backup do `.env.local`:** o CLI **não** inclui o arquivo de envs.
  Faça backup manual dos secrets separadamente.
