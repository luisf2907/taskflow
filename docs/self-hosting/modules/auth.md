# Módulo: Auth

Taskflow usa **GoTrue** (projeto oficial Supabase Auth) como provedor
de autenticação em qualquer perfil. O que muda entre perfis/cenários é
**como** o GoTrue é configurado e como a UI se comporta.

## Modos (`AUTH_MODE`)

### `standard` (default cloud)

Comportamento idêntico ao Supabase Cloud:
- Signup aberto
- Confirmação por email habilitada
- OAuth providers ativos (GitHub, etc. — configurado no GoTrue)
- Password reset via email

Requer:
- `EMAIL_DRIVER` configurado (pra confirmations e reset)
- Providers OAuth configurados no container GoTrue (env `GOTRUE_EXTERNAL_*`)

### `closed` (team self-hosted, sem email)

GoTrue roda com `GOTRUE_DISABLE_SIGNUP=true` + `GOTRUE_MAILER_AUTOCONFIRM=true`.
Admin cria users via CLI. Nenhum email é enviado.

Setup:
```env
AUTH_MODE=closed
EMAIL_DRIVER=disabled
```

Criar user:
```bash
npx taskflow user:create --email felipe@home.lab \
  --password s3cret --name "Felipe"
```

### `solo` (1 usuário, home lab)

Bypass total de login. O `proxy.ts` auto-injeta sessão do usuário
configurado em `SOLO_USER_EMAIL` em toda requisição.

Setup:
```env
AUTH_MODE=solo
SOLO_USER_EMAIL=admin@taskflow.local
```

O usuário é criado automaticamente no bootstrap se não existir. A tela
de login some; acesso direto ao `/dashboard`.

**Limitações:**
- Apenas 1 usuário funciona nesse modo. Tentar criar um segundo quebra
  a assumptão do middleware.
- Só use em ambiente realmente isolado (localhost, LAN confiável).
  **Nunca** exponha um servidor em `AUTH_MODE=solo` pra internet.

## GitHub integration (independente do Auth)

O código foi desenhado pra que a integração com GitHub seja **independente** do
provedor de auth. Há 3 modos controlados por `VCS_TOKEN_MODE`:

### `oauth` (cloud default)
Botão "Conectar com GitHub" em Settings. Requer OAuth do GitHub
configurado no GoTrue (`GOTRUE_EXTERNAL_GITHUB_*`).

### `pat` (recomendado no self-hosted)
Usuário cola Personal Access Token em Settings → GitHub. Funciona com
**qualquer** `AUTH_MODE`, inclusive `solo`. Token fica encriptado em
`github_tokens` com `ENCRYPTION_KEY`.

### `instance-pat` (home lab com GitHub org)
Um PAT global compartilhado por todo o instance. Útil quando há uma
equipe pequena com GitHub org comum.

```env
VCS_TOKEN_MODE=instance-pat
VCS_INSTANCE_PAT=ghp_xxxxx
```

UI de Settings mostra "Token gerenciado pelo admin do instance"
(read-only).

## Providers OAuth no GoTrue

Configuráveis no `docker-compose.*.yml` via env do container gotrue:

```yaml
services:
  gotrue:
    environment:
      GOTRUE_EXTERNAL_GITHUB_ENABLED: "true"
      GOTRUE_EXTERNAL_GITHUB_CLIENT_ID: "Ov23li..."
      GOTRUE_EXTERNAL_GITHUB_SECRET: "..."
      GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI: "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback"
```

Mesma coisa pra Google (`GOOGLE`), Apple (`APPLE`), etc. Lista completa:
https://github.com/supabase/auth/blob/master/internal/conf/configuration.go

## Rotação de secrets

Rotar `JWT_SECRET` invalida todas as sessões ativas (usuários precisam
relogar). Procedimento:

1. `make down`
2. Edite `.env.local`: novo `JWT_SECRET`
3. Regere `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
   (os JWTs precisam ser reassinados com o secret novo)
4. `make up`

**Não altere `ENCRYPTION_KEY`** a menos que siga o procedimento de
migração (em breve: `npx taskflow token:rotate`).
