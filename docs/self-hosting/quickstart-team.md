# Quickstart — perfil Team

Setup completo em ~15 minutos. Ideal para equipes de 2-20 pessoas
em rede local ou VPN.

## O que muda vs. solo

| Aspecto | Solo | Team |
|---|---|---|
| Auth | Bypass (auto-login) | Admin cria users via CLI |
| Email | Desligado (links copiáveis) | SMTP (convites por email) |
| Rate limiting | In-memory | Redis (compartilhado) |
| Primeiro login | Direto | User troca senha temporária |
| Containers | 6 | 7 (+Redis) |
| RAM estimada | ~500 MB | ~700 MB |

## Pré-requisitos

- **Docker** 24+ e **docker compose** v2
- **Node.js** 20+
- ~700 MB de RAM livre e ~2 GB de disco
- Portas 3000 e 8000 livres
- (Opcional) Conta SMTP pra envio de email (Gmail, Mailgun, SES, etc)

## Passos

### 1. Clone e entre no repo

```bash
git clone https://github.com/luisf2907/taskflow.git
cd taskflow
git checkout feat/self-hosted
```

### 2. Gere `.env.local` com secrets

```bash
node scripts/setup-env.mjs team
```

### 3. Configure SMTP (opcional mas recomendado)

Edite `.env.local` e preencha as variáveis SMTP. Exemplo com Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password-16-chars
SMTP_FROM=seu-email@gmail.com
```

Se pular, convites viram links copiáveis (funciona, mas sem notificações
por email).

### 4. Suba o stack

```bash
docker compose -f docker/docker-compose.team.yml --env-file .env.local up -d
```

Ou com `make`:
```bash
make PROFILE=team up
```

Na primeira vez o build do app leva ~3 minutos.

### 5. Aguarde bootstrap terminar

```bash
docker ps
```

Espere todos ficarem `healthy` ou `running`. O container `bootstrap`
deve ficar em `Exited (0)`.

### 6. Valide o stack

```bash
node --env-file=.env.local scripts/cli.mjs health
```

### 7. Crie o admin

```bash
node --env-file=.env.local scripts/cli.mjs bootstrap \
  --admin-email admin@team.local \
  --admin-password changeme \
  --admin-name "Admin" \
  --workspace-name "Meu Time"
```

### 8. Crie users do time

```bash
node --env-file=.env.local scripts/cli.mjs user:create \
  --email bruno@team.local \
  --password temp123 \
  --name "Bruno"
```

O user vai receber uma senha temporária. No primeiro login, será
redirecionado para definir uma nova senha.

Se não quiser forçar troca de senha:
```bash
node --env-file=.env.local scripts/cli.mjs user:create \
  --email maria@team.local \
  --password definitiva123 \
  --name "Maria" \
  --no-password-change
```

### 9. Convide users pro workspace

```bash
node --env-file=.env.local scripts/cli.mjs workspace:invite \
  --workspace "Meu Time" \
  --email bruno@team.local
```

### 10. Acesse o app

```
http://localhost:3000
```

Se estiver em LAN, ajuste `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SITE_URL` no `.env.local` pro IP da máquina host
(ex: `http://192.168.1.100:8000` e `http://192.168.1.100:3000`),
rebuild a imagem app e suba novamente.

## Backup e restore

Mesmo procedimento do perfil solo:

```bash
# Backup
node --env-file=.env.local scripts/cli.mjs backup

# Restore (DESTRUTIVO)
node --env-file=.env.local scripts/cli.mjs restore --from ./backups/taskflow-<ts> --yes
docker restart taskflow-app
```

## Rotacionar secrets

Veja [modules/auth.md](./modules/auth.md#rotação-de-secrets).

## Troubleshooting

| Sintoma | Causa provável |
|---|---|
| App não conecta no Redis | `docker ps` — Redis deve estar `healthy`. Verifique se REDIS_URL está certo no compose. |
| Email não envia | Verifique SMTP_HOST/USER/PASSWORD. Use `EMAIL_DRIVER=console` pra ver emails no stdout. |
| User não é redirecionado pra trocar senha | A flag `must_change_password` é setada pelo CLI. Se criou user de outro jeito, a flag não existe. |
| `make PROFILE=team up` falha | Certifique-se de ter rodado `node scripts/setup-env.mjs team` primeiro. |

## Próximos passos

- [configuration.md](./configuration.md) — referência completa de env vars
- [modules/auth.md](./modules/auth.md) — modos de auth e rotação de secrets
- [modules/email.md](./modules/email.md) — configuração SMTP detalhada
