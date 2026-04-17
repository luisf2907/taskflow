# Módulo: Observability

Error tracking e performance monitoring. Plugável via `OBS_DRIVER`.

## Drivers

| Driver | Backend | Obs |
|---|---|---|
| `sentry` | Sentry.io ou Sentry self-hosted | default cloud |
| `glitchtip` | GlitchTip self-hosted | API 100% compat com Sentry SDK |
| `console` | stderr do container app | default solo (dev) |
| `noop` | descarta tudo | máxima privacidade |

## Setup

### `sentry` (cloud)

```env
OBS_DRIVER=sentry
NEXT_PUBLIC_SENTRY_DSN=https://abc@sentry.io/123
NEXT_PUBLIC_OBS_DRIVER=sentry
```

Sample rates no código:
- Traces: 10% em produção
- Session Replay: 1% sempre, 100% em erros

### `glitchtip` (Sentry-compat self-hosted)

GlitchTip é um fork leve do Sentry, ~300 MB RAM vs ~3 GB. Compatível
com Sentry SDK — o mesmo código funciona, só muda o DSN.

```env
OBS_DRIVER=glitchtip
NEXT_PUBLIC_SENTRY_DSN=https://xxx@glitchtip.suahost.com/1
NEXT_PUBLIC_OBS_DRIVER=glitchtip
```

Deploy do GlitchTip: docker-compose oficial em
https://glitchtip.com/documentation/install. Planejado pro perfil
full (Fase 6).

### `console` (default solo)

```env
OBS_DRIVER=console
```

Logs via `logger.error()` vão pra stderr. Pra ver:
```bash
docker compose logs -f app
```

### `noop`

```env
OBS_DRIVER=noop
```

Descarta todos os errors silenciosamente. Máxima privacidade, mas
você perde visibilidade de bugs.

## O que é enviado

Pelo Sentry SDK:
- Uncaught exceptions no server (Next.js API routes, middleware)
- Uncaught exceptions no client (React errors)
- Transacções de performance (quando `tracesSampleRate > 0`)
- Session replay (quando `replaysSessionSampleRate > 0`)

PII filtering: por default nenhum scrubbing configurado — emails,
user ids, etc podem aparecer nos events. Se precisar, configurar
`beforeSend` em `sentry.client.config.ts` pra remover campos.

## Troubleshooting

### Errors não chegam no Sentry/GlitchTip
1. Conferir driver e DSN no .env:
   ```bash
   docker compose exec app env | grep -i sentry
   ```
2. Rebuild após trocar envs NEXT_PUBLIC_*:
   ```bash
   docker compose build app --no-cache
   ```
3. Abrir DevTools → Network → procurar POSTs pra `ingest.sentry.io`
   ou seu host GlitchTip. Se zero requests, SDK não está enviando.

### Console driver spammando logs
- `OBS_DRIVER=console` loga todos os errors, incluindo os tolerados
  pelo app. Filtrar no docker logs:
  ```bash
  docker compose logs app --tail 100 | grep -v "expected"
  ```
