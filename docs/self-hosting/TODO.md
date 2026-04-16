# TODO — self-hosted

Débito técnico e limitações conhecidas, em ordem aproximada de prioridade.

## Bloqueadores do perfil solo (funcionar end-to-end)

- [x] **CLI admin** — `scripts/cli.mjs` com `bootstrap`, `user:*`,
      `workspace:*`, `health`. Fase 2 Commit B concluído.
- [x] **`/api/health` endpoint** — já existia, agora público no proxy
      (Fase 2 Commit A). Container app fica healthy.
- [x] **Solo mode auto-login** — `/api/auth/solo-login` cria user se
      não existe e seta sessão (Fase 2 Commit A + hotfixes).
- [x] **Driver storage `local-disk`** (Fase 3 completa) — drivers
      supabase + local-disk implementados em `src/lib/drivers/storage/`.
      Uploads de wiki, anexos, reunião audio via signed URL, tudo via
      `/api/storage/*`. `modules/storage.md` documenta detalhes.
- [ ] **Driver realtime `pg-notify-sse`** (Fase 4) — sem isso, kanban
      não atualiza em tempo real pra outros usuários. Temos opção
      `polling` como fallback, mas ainda assim precisa do código do
      driver no cliente.
- [ ] **Trigger `on_auth_user_created` não funciona em self-hosted** —
      investigar causa. Workaround: CLI + solo-login fazem upsert
      manual em `public.perfis`.

## Drivers não implementados

- [ ] **LLM drivers** (Fase 5): implementação concreta para `ollama`,
      `openai-compat`, `anthropic`. Hoje só `gemini` e `disabled`
      funcionam.
- [ ] **Email drivers** (Fase 5): `smtp` (Nodemailer), `postmark`,
      `console`. Hoje só `resend` e `disabled`.
- [ ] **Observability drivers** (Fase 5): `glitchtip`, `console`,
      `noop`. Hoje só `sentry`.
- [ ] **VCS drivers** (Fase 5): `gitea`, `instance-pat` mode. Hoje só
      `github` com `oauth` e `pat`.
- [ ] **Voice driver `disabled`** (Fase 5): UI precisa esconder tab
      "Gravar" quando `VOICE_DRIVER=disabled`.

## Infra

- [ ] **Perfis team e full** (Fase 6): docker-compose com Redis,
      Ollama, MinIO, Supabase Realtime, Voice Worker, Postfix,
      GlitchTip.
- [ ] **Dockerfile do voice-worker** (Fase 6): empacotar FastAPI +
      Whisper + pyannote + CUDA.
- [ ] **storage-api container** para perfil full (quando operador
      quiser `STORAGE_DRIVER=supabase` em self-hosted).

## Segurança

- [ ] **Bucket `anexos` sem policies** — replicado do estado de
      produção. Qualquer authenticated user faz upload/delete em
      qualquer cartão de qualquer workspace. Fix em PR separado,
      aplicado em ambas as versões (cloud + self-hosted).
- [ ] **Testes de RLS** (Fase 8) — 2 users de workspaces diferentes,
      garantir isolamento.
- [ ] **Rotação de secrets** — comandos `token:rotate` e procedimento
      pra trocar `ENCRYPTION_KEY` com migração de dados encriptados.

## Documentação

- [ ] **docs/self-hosting/modules/** — 1 arquivo por driver explicando
      opções e trade-offs.
- [ ] **backup-recovery.md**, **upgrade.md**, **troubleshooting.md**
      (Fase 7).

## Observabilidade e testes

- [ ] **Smoke test script** por profile (Fase 8) — `docker compose up` +
      checks HTTP básicos.
- [ ] **CI self-hosted** (Fase 8) — GitHub Actions que sobe stack solo
      e roda smoke test.

## Polimento (Fase 9)

- [ ] Validar schema drift: script que compara dump de produção com
      `bootstrap.sql` e avisa se divergiram.
- [ ] Make targets pra rotação de secrets, migração de storage
      cloud→local, health detalhado.
- [ ] `.env.team.example`, `.env.full.example`.

## Regenerar bootstrap.sql

Quando schema de produção mudar, regenerar é manual:

```bash
supabase db dump --linked --schema public > dump-public.sql
supabase db dump --linked --schema storage > dump-storage.sql
```

E reconstruir `supabase/self-hosted/bootstrap.sql` substituindo seção
2. Automatizar num script (`scripts/regen-bootstrap.sh`) é TODO.
