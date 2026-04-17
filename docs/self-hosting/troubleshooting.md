# Troubleshooting

Erros comuns encontrados durante setup e operação do self-hosted.

---

## Stack não sobe

### Container `bootstrap` fica em `Exited (1)`

**Causa:** Postgres não subiu ou GoTrue não criou `auth.users` a tempo.

```bash
docker logs taskflow-bootstrap
```

Se diz "GoTrue nao criou auth.users em 120s":
- Cheque logs do GoTrue: `docker logs taskflow-gotrue`
- Causa mais comum: senha do Postgres não bate (ver próximo item)

### GoTrue: "password authentication failed for user postgres"

**Causa:** Volume `taskflow-postgres-data` foi criado com uma senha e
agora o `.env.local` tem outra. Postgres ignora `POSTGRES_PASSWORD` se
o volume já tem dados.

**Fix:**
```bash
# Opção A — limpar tudo e começar do zero
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local down -v
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d

# Opção B — usar a senha anterior
# Copie POSTGRES_PASSWORD do .env.local antigo (ou .env.local.bak.*)
```

### App fica `(unhealthy)` mas funciona pelo browser

**Causa:** Healthcheck usa `wget http://localhost:3000` mas dentro do
container Alpine, `localhost` resolve pra IPv6 (`::1`) enquanto Next.js
binda só em IPv4 (`0.0.0.0`).

**Fix:** Já corrigido — Dockerfile.app usa `127.0.0.1`. Se está num
build antigo, rebuild: `docker compose build app`

---

## Login e autenticação

### Redirect pra `http://0.0.0.0:3000/...`

**Causa:** Next.js standalone com `HOSTNAME=0.0.0.0` — `request.url`
resolve pro bind address do container em vez do hostname do browser.

**Fix:** Já corrigido no `proxy.ts` e `auth/callback/route.ts` com
`buildRedirectUrl()` que lê `Host`/`X-Forwarded-Host` do request.
Se está num build antigo, rebuild.

### "Falha na autenticação" ao clicar link de verificação de email

**Causa:** Fluxo PKCE — o `code_verifier` é salvo no browser onde o
signup aconteceu. Se o link de verificação abre em contexto diferente
(outro browser, aba do email client), `exchangeCodeForSession` falha.

**Porém:** O email **já foi verificado** pelo GoTrue. O user pode
logar normalmente.

**Fix:** Já corrigido — callback detecta erro PKCE e mostra
"Email verificado! Faça login para continuar." em verde.

### Botão "Continuar com GitHub" aparece sem OAuth configurado

**Fix:** Controlado por `NEXT_PUBLIC_GITHUB_OAUTH=true/false` (default
`false`). Só aparece quando explicitamente habilitado. Requer rebuild
se mudou a env.

### Signup desabilitado mesmo com `AUTH_MODE=standard`

**Causa:** GoTrue ainda tem `GOTRUE_DISABLE_SIGNUP=true`.

**Fix:** Adicione no `.env.local`:
```env
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_MAILER_AUTOCONFIRM=false
```
E recrie o GoTrue: `docker compose up -d --force-recreate gotrue`

---

## Storage

### Upload falha com "STORAGE_DRIVER=s3-compat ainda nao implementado"

**Causa:** Build antigo (antes do S3 driver ser implementado).

**Fix:** Rebuild: `docker compose build app`

### MinIO: "NoSuchBucket"

**Causa:** Bucket não existe ainda. O S3 driver cria automaticamente
no primeiro upload, mas a primeira tentativa pode falhar por race.

**Fix:** Tente o upload novamente. Ou crie manualmente via MinIO
console (`http://localhost:9001`).

### Anexo de outro workspace: "Sem acesso ao cartao" (403)

**Esperado!** Fix de segurança ativo — `guardAnexoAccess()` valida
que o user é membro do workspace dono do cartão.

---

## Realtime

### Kanban não atualiza em tempo real (outra aba)

**Checar:**
1. `REALTIME_DRIVER` está setado? Se `polling`, delay de ~10s é normal.
2. Se `pg-notify-sse`: abra DevTools → Network → filtre "realtime".
   Deve ter uma conexão SSE aberta. Se não, cheque logs do app.
3. Se `supabase`: tabelas precisam de Realtime habilitado no Dashboard
   (Database → Replication). Ver `supabase/cloud/README.md` passo 6.

### SSE desconecta frequentemente

Comportamento normal — browser reconecta automaticamente com backoff.
Se persistir, pode ser proxy/load balancer cortando conexões longas.
Aumente timeout de idle no proxy reverso.

---

## Nginx gateway

### 404 Not Found em `/verify`

**Causa:** GoTrue gera links de verificação como `http://host:8000/verify`
sem o prefixo `/auth/v1`.

**Fix:** Já corrigido — nginx.conf tem rota `/verify` que proxeia
pro GoTrue. Se está num build antigo, recrie nginx:
`docker compose up -d --force-recreate nginx`

### 400 "Request Header Or Cookie Too Large"

**Causa:** Cookies JWT do Supabase Auth são grandes. Defaults do nginx
(1KB buffer) não suportam.

**Fix:** Já corrigido — nginx.conf tem `large_client_header_buffers 4 32k`.
Recrie nginx se necessário.

---

## CLI

### "Envs faltando: NEXT_PUBLIC_SUPABASE_URL, ..."

**Causa:** Esqueceu `--env-file=.env.local` no comando.

**Fix:**
```bash
node --env-file=.env.local scripts/cli.mjs <comando>
```

### backup: "container taskflow-postgres nao existe"

**Causa:** Stack não está rodando.

**Fix:** Suba a stack primeiro: `docker compose ... up -d`

### token:rotate --encryption: "container app nao existe"

**Causa:** CLI tenta parar o container `taskflow-app` durante a
rotação, mas ele não existe.

**Fix:** Suba a stack primeiro. O `--encryption` precisa do app
parado pra evitar race — o CLI para e reinicia automaticamente.

---

## Performance

### Build da imagem app demora >5 minutos

Normal na primeira vez (baixa deps + compila Next.js). Builds
subsequentes usam cache de layers. Pra acelerar:
- Use imagens publicadas do GHCR quando disponíveis:
  `ghcr.io/luisf2907/taskflow-app:latest`
- Substitua `build:` por `image:` no compose.

### Postgres lento em queries com muitos workspaces

RLS policies foram otimizadas em `025_rls_performance_overhaul.sql`
usando `my_workspace_ids()` (materializa workspace IDs do user uma
vez por query). Se ainda lento, cheque `EXPLAIN ANALYZE` da query.
