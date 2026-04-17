# Taskflow self-hosted

Rode o Taskflow na sua infraestrutura, sem dependência de SaaS externos.

> **Status:** em desenvolvimento (branch `feat/self-hosted`). Perfil solo
> tem chassi funcional — falta CLI admin (Fase 2) e drivers de storage
> e realtime (Fases 3–4) pra ficar completo. Veja [TODO.md](./TODO.md).

## Qual perfil é pra mim?

| Perfil | Cenário | RAM | Containers | Features |
|---|---|---|---|---|
| **solo** | 1 pessoa, home lab, dev local | ~500 MB | 6 | Tudo opcional off; GitHub via PAT |
| **team** | 2–20 pessoas, rede interna | ~700 MB | 7 | +Redis (rate limit), SMTP, troca de senha obrigatória |
| **full** | Paridade SaaS | ~4 GB | 10+ | +MinIO (S3), +GlitchTip (errors), +Voice (GPU) |
| **dev** | Desenvolvimento local | ~300 MB | 5 | Só infra (postgres, gotrue, postgrest, nginx) — app no host |

Comece pelo [quickstart-solo](./quickstart-solo.md) se estiver em dúvida.

## Índice

- **Quickstart** — setup em 10 minutos
  - [quickstart-solo.md](./quickstart-solo.md)
  - [quickstart-team.md](./quickstart-team.md)
  - [quickstart-full.md](./quickstart-full.md)
- [configuration.md](./configuration.md) — referência completa de env vars
- [TODO.md](./TODO.md) — débito técnico conhecido
- **Módulos** — docs por driver
  - [auth.md](./modules/auth.md)
  - [storage.md](./modules/storage.md)
  - [realtime.md](./modules/realtime.md)
  - [email.md](./modules/email.md)
  - [vcs.md](./modules/vcs.md)
  - [observability.md](./modules/observability.md)
  - llm.md *(em breve — Fase 5)*
  - email.md *(em breve — Fase 5)*
  - voice.md *(em breve — Fase 5)*
  - vcs.md *(em breve — Fase 5)*
- backup-recovery.md *(em breve — Fase 7)*
- upgrade.md *(em breve — Fase 7)*
- troubleshooting.md *(em breve — Fase 7)*

## Arquitetura (perfil solo)

```
           ┌─────────────────────────────────────────────────┐
           │   Browser → http://localhost:3000               │
           └──────────────┬──────────────────────────────────┘
                          │
    ┌─────────────────────▼───────────────────────────┐
    │  app (Next.js standalone)                       │
    │  - Páginas + API routes                         │
    │  - Drivers: storage (local), realtime (SSE)     │
    │  - Conecta em /auth/v1 e /rest/v1 via nginx     │
    └─────────┬────────────────────┬──────────────────┘
              │                    │
    ┌─────────▼──────┐   ┌────────▼─────────┐
    │ nginx (8000)   │   │ volume: storage  │
    │ /auth/v1/*     │   │                  │
    │ /rest/v1/*     │   └──────────────────┘
    └─────────┬──────┘
              │
    ┌─────────┴────────────┬─────────────────┐
    │                      │                 │
┌───▼────┐          ┌─────▼──────┐    ┌─────▼─────┐
│ gotrue │          │ postgrest  │    │ bootstrap │
│ :9999  │          │ :3000      │    │ (one-shot)│
└───┬────┘          └──────┬─────┘    └─────┬─────┘
    │                      │                 │
    └──────────────┬───────┴─────────────────┘
                   │
           ┌───────▼──────────┐
           │ postgres         │
           │ (pgvector/pg17)  │
           └──────────────────┘
```

## Princípios de design

1. **Zero perda de feature vs. cloud.** Tudo que roda em Supabase Cloud
   funciona self-hosted.
2. **Modularidade real.** Cada módulo (LLM, email, voice, etc.) tem
   driver `disabled` que faz a UI esconder a feature.
3. **Zero reescrita de código.** O app continua usando `@supabase/ssr` —
   a mudança é de infra, não de contratos.
4. **Graceful degradation.** Desligar email? Convites viram link.
   Desligar realtime? SWR polling a cada 10s.

## Links úteis

- Plano completo da fase: `C:\Users\Luis Felipe\.claude\plans\curious-fluttering-crane.md`
- SQL de bootstrap: [supabase/self-hosted/README.md](../../supabase/self-hosted/README.md)
