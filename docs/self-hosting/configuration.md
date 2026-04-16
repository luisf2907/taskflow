# Configuration — referência de env vars

Lista completa de todas as envs que o Taskflow self-hosted conhece.
Fonte de verdade: [`src/lib/env.ts`](../../src/lib/env.ts) (validação Zod).

Convenção:
- **Obrigatória**: server não sobe sem ela
- **Opcional**: tem default ou feature desliga gracefully

## Supabase core

| Env | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do gateway (nginx em solo, Kong em full). Ex: `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | JWT anon key. Gerado por `gen-secrets.sh` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | JWT service_role. Gerado por `gen-secrets.sh` |
| `NEXT_PUBLIC_SITE_URL` | opcional | Default `https://taskflow.app`. Em self-hosted: `http://localhost:3000` |

## Segurança

| Env | Obrigatória | Descrição |
|---|---|---|
| `ENCRYPTION_KEY` | ✅ | AES-256-GCM, 64 hex chars. Encripta GitHub PATs + API keys. **Não rotacionar** depois de usar — invalida dados. |
| `JWT_SECRET` | ✅ (self-hosted) | 32+ bytes hex. Assina JWTs do GoTrue e PostgREST. **Não rotacionar** — invalida sessões. |
| `POSTGRES_PASSWORD` | ✅ (self-hosted) | Senha do user postgres no DB. |

## Auth

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `AUTH_MODE` | `standard` | `standard` \| `closed` \| `solo` | `standard` = signup aberto (cloud). `closed` = só admin cria users via CLI. `solo` = bypass de login. |
| `SOLO_USER_EMAIL` | — | email | Usado só quando `AUTH_MODE=solo`. |

## LLM (IA)

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `LLM_DRIVER` | `gemini` se `GEMINI_API_KEY` presente, else `disabled` | `gemini` \| `ollama` \| `openai-compat` \| `anthropic` \| `disabled` | Backend de IA |
| `LLM_BASE_URL` | — | URL | Endpoint pra `ollama` (ex: `http://ollama:11434`) ou `openai-compat` |
| `LLM_MODEL` | — | string | Nome do modelo (ex: `llama3.1`, `gpt-4o-mini`) |
| `LLM_API_KEY` | — | string | Chave do provedor (exceto `ollama`) |
| `GEMINI_API_KEY` | — | string | Usado se `LLM_DRIVER=gemini` |

## Email

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `EMAIL_DRIVER` | `resend` se `RESEND_API_KEY`, else `disabled` | `smtp` \| `resend` \| `postmark` \| `console` \| `disabled` | Backend de email |
| `RESEND_API_KEY` | — | string | Usado se `EMAIL_DRIVER=resend` |
| `SMTP_HOST` | — | string | Ex: `smtp.gmail.com` |
| `SMTP_PORT` | — | int | Ex: 587 (TLS) ou 465 (SSL) |
| `SMTP_USER` | — | string | Usuário SMTP |
| `SMTP_PASSWORD` | — | string | Senha ou app password |
| `SMTP_FROM` | — | email | Remetente default |
| `SMTP_SECURE` | — | bool | `true` pra SSL, `false` pra TLS opcional |

## Storage

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `STORAGE_DRIVER` | `supabase` | `supabase` \| `local-disk` \| `s3-compat` | Backend de arquivos |
| `STORAGE_LOCAL_PATH` | `/app/storage` | path | Volume quando `local-disk` |
| `STORAGE_S3_ENDPOINT` | — | URL | S3 (AWS, MinIO, Cloudflare R2, etc) |
| `STORAGE_S3_REGION` | — | string | Região S3 |
| `STORAGE_S3_ACCESS_KEY` | — | string | |
| `STORAGE_S3_SECRET_KEY` | — | string | |
| `STORAGE_S3_BUCKET_PREFIX` | — | string | Prefixo nos nomes dos buckets |

## Realtime

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `REALTIME_DRIVER` | `supabase` | `supabase` \| `pg-notify-sse` \| `polling` | Como o kanban atualiza em tempo real |

- `supabase` = container Realtime (Phoenix/Elixir, ~200 MB RAM)
- `pg-notify-sse` = driver leve custom: triggers + LISTEN/NOTIFY + SSE endpoint no app
- `polling` = SWR revalida a cada 10s (fallback gracefully degraded)

## Voice (reuniões)

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `VOICE_DRIVER` | `fastapi` se `VOICE_WORKER_URL`, else `disabled` | `fastapi` \| `disabled` | Worker de transcrição |
| `VOICE_WORKER_URL` | — | URL | Endpoint do worker FastAPI (precisa GPU) |
| `VOICE_WORKER_API_KEY` | — | string | Bearer token pro worker |
| `VOICE_WEBHOOK_SECRET` | — | 32+ chars | HMAC pra callback do worker |

## VCS (GitHub/Gitea)

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `VCS_DRIVER` | `github` | `github` \| `gitea` \| `disabled` | Provedor VCS |
| `VCS_API_URL` | `https://api.github.com` | URL | Override pra GitHub Enterprise ou Gitea |
| `VCS_TOKEN_MODE` | `oauth` | `oauth` \| `pat` \| `instance-pat` | Como tokens são obtidos |
| `VCS_INSTANCE_PAT` | — | string | Token global (se `VCS_TOKEN_MODE=instance-pat`) |

- `oauth` = botão "Conectar com GitHub" (requer Supabase OAuth configurado)
- `pat` = usuário cola PAT em Settings → GitHub (funciona com qualquer auth)
- `instance-pat` = 1 PAT global pra todo o instance (home lab)

## Observability

| Env | Default | Valores | Descrição |
|---|---|---|---|
| `OBS_DRIVER` | `sentry` se DSN presente, else `console` | `sentry` \| `glitchtip` \| `console` \| `noop` | Error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | — | URL | DSN (Sentry ou GlitchTip self-hosted) |

## Rate limiting

| Env | Default | Descrição |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | — | Se presente, usa Upstash pra rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | — | Token Upstash |

Sem Upstash, fallback é in-memory (ok pra single-instance).

## Validação

Se alguma env obrigatória estiver faltando ou inválida, o server loga
erro e não sobe:

```
Missing or invalid server environment variables:
  ENCRYPTION_KEY: ENCRYPTION_KEY must be 64 hex chars...
  SUPABASE_SERVICE_ROLE_KEY: Required
```

Veja [`src/lib/env.ts`](../../src/lib/env.ts) pro schema Zod completo.
