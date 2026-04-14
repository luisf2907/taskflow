# Deployment — TaskFlow

Guia para subir o TaskFlow em produção. Target recomendado: **Vercel** (zero-config para Next.js 16 App Router, compatível nativamente com Supabase e Upstash Redis).

## Pré-requisitos

- Conta Vercel com o repositório conectado.
- Projeto Supabase de produção criado e com as migrations aplicadas (`supabase/migrations/`).
- Conta Upstash com Redis REST criado (plano free serve para começar).
- App GitHub OAuth criada com callback `https://<dominio-prod>/auth/callback`.
- Conta Sentry com projeto Next.js criado (opcional mas recomendado).
- Conta Resend com domínio verificado (se for usar email).
- Chave da API Gemini (se for usar features de IA).

## Variáveis de ambiente

Todas são configuradas no Vercel em **Settings → Environment Variables** (escopo: Production).

### Obrigatórias

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (safe no cliente, respeitada por RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**server-only**, bypassa RLS). |
| `NEXT_PUBLIC_SITE_URL` | URL pública do app (ex.: `https://taskflow.app`). Usada em callbacks de email/OAuth. |

### Obrigatórias em produção serverless

| Variável | Por que | Como obter |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Rate limit in-memory **não funciona** entre invocações serverless. Sem Upstash, o limitador cai para um `Map` local que não é compartilhado — efetivamente desligado. | [console.upstash.com](https://console.upstash.com) → Create Database → Global |
| `UPSTASH_REDIS_REST_TOKEN` | Idem. | Mesma tela, campo `UPSTASH_REDIS_REST_TOKEN`. |
| `ENCRYPTION_KEY` | AES-256-GCM para criptografar `github_tokens.provider_token`. Sem isso, o token vai em plaintext. | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — 64 hex chars. |

### Opcionais (habilitam features)

| Variável | Feature desabilitada se faltar |
|---|---|
| `GEMINI_API_KEY` | Geração e enhancement de cards por IA. |
| `RESEND_API_KEY` | Emails transacionais (convites, notificações). |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking em produção. |
| `VOICE_WORKER_URL`, `VOICE_WORKER_API_KEY`, `VOICE_WEBHOOK_SECRET` | Transcrição e enrollment de voz. Se ausente, tela de Voz mostra "worker indisponível". |

`VOICE_WEBHOOK_SECRET` precisa ter no mínimo 32 caracteres se for usado. `ENCRYPTION_KEY` precisa ter exatamente 64 hex chars. A validação está em `src/lib/env.ts` via zod.

## Configuração do Supabase prod

1. **Aplicar migrations**: `supabase link --project-ref <ref>` e depois `supabase db push`.
2. **Confirmar RLS**: `supabase db lint` não deve reportar tabelas sem policy.
3. **Backups**: no dashboard Supabase, **Settings → Database → Backups** — habilitar PITR (Point-in-time recovery) se o plano permitir. Janela recomendada: 7 dias.
4. **Storage**: conferir que os buckets de wiki e perfis existem (migration `044` cria o bucket `wiki`).

## Configuração do GitHub OAuth

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. **Authorization callback URL**: `https://<dominio-prod>/auth/callback`.
3. Copiar Client ID e Secret para as env vars no Supabase em **Authentication → Providers → GitHub** (não no Vercel — o Supabase que faz o handshake).
4. Scopes mínimos: `repo`, `read:user`.

## Headers de segurança

Já configurados em `next.config.ts`:

- HSTS com `preload`
- CSP estrito (ajusta dinamicamente o host do Supabase via `NEXT_PUBLIC_SUPABASE_URL`)
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin

**Nada a fazer no Vercel** — os headers são servidos pelo Next.js.

## Rate limiting: nota sobre IP

`src/lib/api-utils.ts` lê `x-forwarded-for` para identificar o cliente. Em Vercel esse header é populado pelo edge e confiável. **Se for migrar para outro provedor** (ex.: self-hosted atrás de Cloudflare), garantir que o proxy da frente strip-e e re-escreva o header, senão clientes podem spoof o IP e burlar o rate limit.

## Checklist de go-live

- [ ] Projeto Vercel criado e conectado ao repo, branch `main`.
- [ ] Domínio custom ligado com SSL ativo.
- [ ] Todas as env vars obrigatórias configuradas (Production).
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` populados.
- [ ] `ENCRYPTION_KEY` gerado e salvo em cofre (perder = perder os tokens do GitHub).
- [ ] Migrations aplicadas via `supabase db push`.
- [ ] Backups Supabase on.
- [ ] GitHub OAuth callback apontando pro domínio de prod.
- [ ] Sentry DSN testado com erro proposital em `/api/debug-error` ou via console.
- [ ] CSP sem violations em DevTools ao navegar no dashboard logado.
- [ ] Golden path manual: signup → confirmar email → criar workspace → criar card → mover entre colunas → criar PR via `start-work` → `finish-work`.
- [ ] Smoke MCP: `curl -X POST https://<dominio>/api/mcp -H "Authorization: Bearer tf_sk_..." -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` retorna a lista de tools.

## Rollback

1. No Vercel, **Deployments → selecionar deploy anterior → Promote to Production** (reversível em segundos).
2. Para reverter schema do banco: `supabase db reset` **apenas em staging**. Em prod, a melhor estratégia é **forward-fix** (criar uma nova migration que desfaz) — `reset` destrói dados.
3. Se o problema for uma env var, editar no Vercel e **Redeploy** (não precisa novo commit).

## Observabilidade em prod

- **Logs de app**: Vercel → Logs (streaming em tempo real).
- **Erros**: Sentry → Issues. Alertar por email em qualquer issue nova.
- **Rate limit hits**: conferir via `@upstash/redis` CLI ou dashboard Upstash (chaves `rl:*`).
- **Supabase**: dashboard → Database → Query Performance para slow queries.
