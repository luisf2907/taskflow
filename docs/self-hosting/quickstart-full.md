# Quickstart — perfil Full

Setup completo pra paridade SaaS on-premise. ~30 minutos.

## O que muda vs. team

| Aspecto | Team | Full |
|---|---|---|
| Storage | Local-disk (volume Docker) | MinIO (S3-compat, versionado) |
| Error tracking | Console (stderr) | GlitchTip (Sentry-compat, dashboard) |
| Auth | Closed (CLI) | Standard (signup + email verification) |
| Voice | Disabled | Opcional (GPU NVIDIA) |
| Containers | 7 | 10+ |
| RAM estimada | ~700 MB | ~4 GB (sem voice-worker) |

## Pré-requisitos

- **Docker** 24+ e **docker compose** v2
- **Node.js** 20+
- ~4 GB de RAM livre e ~10 GB de disco
- Portas 3000, 8000, 8800, 9001 livres
- Conta SMTP pra envio de email
- (Opcional) GPU NVIDIA + nvidia-container-toolkit pra voice worker

## Passos

### 1. Clone e entre no repo

```bash
git clone https://github.com/luisf2907/taskflow.git
cd taskflow
git checkout feat/self-hosted
```

### 2. Gere `.env.local`

```bash
node scripts/setup-env.mjs full
```

### 3. Configure SMTP

Edite `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password
SMTP_FROM=seu-email@gmail.com
```

### 4. Suba o stack

```bash
docker compose -f docker/docker-compose.full.yml --env-file .env.local up -d
```

Ou com `make`:
```bash
make PROFILE=full up
```

### 5. Valide

```bash
node --env-file=.env.local scripts/cli.mjs health
```

### 6. Crie admin

```bash
node --env-file=.env.local scripts/cli.mjs bootstrap \
  --admin-email admin@company.com \
  --admin-password changeme \
  --admin-name "Admin" \
  --workspace-name "Company"
```

### 7. Configure GlitchTip (error tracking)

1. Acesse `http://localhost:8800`
2. Crie uma organização e projeto
3. Copie a DSN gerada
4. Edite `.env.local`:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=http://key@localhost:8800/1
   ```
5. Rebuild o app:
   ```bash
   docker compose -f docker/docker-compose.full.yml --env-file .env.local build app
   docker compose -f docker/docker-compose.full.yml --env-file .env.local up -d app
   ```

### 8. MinIO console (storage admin)

- Acesse `http://localhost:9001`
- Login: minioadmin / minioadmin (ou o que setou em `STORAGE_S3_ACCESS_KEY/SECRET_KEY`)
- Buckets são criados automaticamente no primeiro upload (taskflow-wiki, taskflow-anexos, taskflow-reunioes-audio)

### 9. (Opcional) Voice Worker

Requer GPU NVIDIA com nvidia-container-toolkit instalado.

1. Coloque o código do voice-worker em `../taskflow-voice/` (repo separado)
2. Descomente o service `voice-worker` no `docker-compose.full.yml`
3. Edite `.env.local`:
   ```env
   VOICE_DRIVER=fastapi
   VOICE_WORKER_URL=http://voice-worker:8080
   VOICE_WORKER_API_KEY=changeme-voice-key
   VOICE_WEBHOOK_SECRET=changeme-min-32-chars-aqui-para-seguranca
   HF_TOKEN=hf_xxx  # token do Hugging Face (pyannote requer)
   ```
4. Build e suba:
   ```bash
   docker compose -f docker/docker-compose.full.yml --env-file .env.local build voice-worker
   docker compose -f docker/docker-compose.full.yml --env-file .env.local up -d voice-worker
   ```

Primeiro start demora ~5 min (baixa modelos Whisper + pyannote).

## Desenvolvimento local (compose dev)

Pra desenvolver o app com hot reload, use o compose dev (só infra):

```bash
docker compose -f docker/docker-compose.dev.yml --env-file .env.local up -d
npm run dev
# App em http://localhost:3000, Postgres exposto em localhost:5432
```

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| MinIO unhealthy | Verifique se porta 9000 está livre. `docker logs taskflow-minio` |
| GlitchTip 500 | Precisa criar DB `glitchtip` no Postgres: `docker exec -i taskflow-postgres psql -U postgres -c "CREATE DATABASE glitchtip;"` |
| Voice worker "CUDA not available" | nvidia-container-toolkit não instalado ou `--gpus all` não configurado |
| S3 upload falha com "NoSuchBucket" | Primeira tentativa cria o bucket. Tente novamente. |

## Próximos passos

- [configuration.md](./configuration.md) — referência completa de env vars
- [modules/auth.md](./modules/auth.md) — modos de auth e rotação de secrets
- [modules/storage.md](./modules/storage.md) — drivers de storage
