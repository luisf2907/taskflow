# Quickstart — perfil Solo

Setup completo em ~10 minutos. Ideal para 1 usuário, home lab, ou dev
local.

## Pré-requisitos

- **Docker** 24+ e **docker compose** v2
- **make** (opcional mas recomendado — atalhos úteis)
- **openssl** e **node** (usados pelo script de secrets)
- ~500 MB de RAM livre e ~2 GB de disco
- Porta 3000 e 8000 livres

## Passos

### 1. Clone e entre no repo

```bash
git clone https://github.com/luisf2907/taskflow.git
cd taskflow
git checkout feat/self-hosted
```

### 2. Gere `.env.local` com secrets

**Qualquer shell (PowerShell, bash, cmd, Git Bash):**
```bash
node scripts/setup-env.mjs
```

**Se você tem `make`:**
```bash
make setup
```

Ambos criam `.env.local` a partir de `.env.solo.example`, substituindo
os placeholders por secrets seguros (JWT, senhas, chave de criptografia).

> **Importante:** `ENCRYPTION_KEY` e `JWT_SECRET` **não devem ser
> rotacionados** depois de o stack ter sido usado. Rotate
> `ENCRYPTION_KEY` invalida GitHub PATs salvos; rotate `JWT_SECRET`
> invalida sessões ativas. Se precisar, há comandos dedicados de
> rotação (ver [TODO.md](./TODO.md)).

### 3. Suba o stack

**Com `make`:**
```bash
make up
```

**Sem `make`:**
```bash
docker compose -f docker/docker-compose.solo.yml --env-file .env.local up -d
```

Na primeira vez o build do app leva ~2 minutos. Acompanhe:

**Com `make`:**
```bash
make logs
```

**Sem `make`:**
```bash
docker compose -f docker/docker-compose.solo.yml --env-file .env.local logs -f
```

### 4. Aguarde o bootstrap terminar

O container `taskflow-bootstrap` aplica o schema e sai com sucesso. Os
outros serviços dependem dele. Veja com:

**Com `make`:**
```bash
make ps
```

**Sem `make`:**
```bash
docker compose -f docker/docker-compose.solo.yml --env-file .env.local ps
```

Espere todos ficarem `healthy` ou `running`. O container `bootstrap`
deve ficar em `Exited (0)` — isso é o comportamento correto.

### 5. Valide o stack

A CLI tem um comando de health que faz uma varredura completa (gateway,
GoTrue, PostgREST, tabelas, RPCs):

**Com `make`:**
```bash
make health
```

**Sem `make`:**
```bash
node --env-file=.env.local scripts/cli.mjs health
```

Esperado: todas as linhas com `✓` e mensagem final "Stack 100% saudavel."

### 6. (Opcional) Pule o bootstrap se for `AUTH_MODE=solo`

No perfil solo default (`AUTH_MODE=solo`), o user admin é **criado
automaticamente** na primeira vez que você acessa `/dashboard` —
proxy redireciona pra `/api/auth/solo-login`, handler cria
`admin@taskflow.local` via admin API, loga você direto. Sem precisar
rodar `bootstrap`.

Pula direto pro passo 7.

### 7. (Modo closed/standard) Criar primeiro admin com CLI

Se você **desligou o solo mode** no `.env.local` (`AUTH_MODE=closed`
ou `standard`), precisa criar o admin via CLI:

**Com `make`:**
```bash
make bootstrap EMAIL=you@example.com PASSWORD=changeme NAME="Felipe" WORKSPACE="Home"
```

**Sem `make`:**
```bash
node --env-file=.env.local scripts/cli.mjs bootstrap \
  --admin-email you@example.com \
  --admin-password changeme \
  --admin-name "Felipe" \
  --workspace-name "Home"
```

Isso cria:
- User no GoTrue
- Row em `public.perfis` (contorna o bug do trigger)
- Workspace "Home" com você como admin

Outros comandos úteis da CLI:

**Com `make`:**
```bash
make user-create EMAIL=bruno@home.lab PASSWORD=s3cret NAME="Bruno"
make user-list
make user-reset-password EMAIL=bruno@home.lab PASSWORD=nova
make user-delete EMAIL=bruno@home.lab

make workspace-create NAME="Outro" OWNER=you@example.com
make workspace-list
make workspace-invite WORKSPACE="Outro" EMAIL=bruno@home.lab
#   → gera link copiável, sem mandar email
```

**Sem `make`:**
```bash
node --env-file=.env.local scripts/cli.mjs user:create \
  --email bruno@home.lab \
  --password s3cret \
  --name "Bruno"
node --env-file=.env.local scripts/cli.mjs user:list
node --env-file=.env.local scripts/cli.mjs user:reset-password \
  --email bruno@home.lab \
  --password nova
node --env-file=.env.local scripts/cli.mjs user:delete \
  --email bruno@home.lab \
  --yes

node --env-file=.env.local scripts/cli.mjs workspace:create \
  --name "Outro" \
  --owner you@example.com
node --env-file=.env.local scripts/cli.mjs workspace:list
node --env-file=.env.local scripts/cli.mjs workspace:invite \
  --workspace "Outro" \
  --email bruno@home.lab
```

### 8. Abra o app

```
http://localhost:3000
```

## Comandos úteis

**Com `make`:**
```bash
make logs              # segue logs de todos
make logs SERVICE=app  # logs de um serviço específico
make ps                # status
make down              # derruba (mantém dados)
make clean             # APAGA TUDO (postgres + storage)
make rebuild           # rebuild só da imagem do app
make backup            # dump Postgres + tar storage em ./backups/
make shell SERVICE=app # entra no container
```

**Sem `make`:**
```bash
docker compose -f docker/docker-compose.solo.yml --env-file .env.local logs -f
docker compose -f docker/docker-compose.solo.yml --env-file .env.local logs -f app
docker compose -f docker/docker-compose.solo.yml --env-file .env.local ps
docker compose -f docker/docker-compose.solo.yml --env-file .env.local down
docker compose -f docker/docker-compose.solo.yml --env-file .env.local down -v
docker compose -f docker/docker-compose.solo.yml --env-file .env.local build app
docker compose -f docker/docker-compose.solo.yml --env-file .env.local up -d app
node --env-file=.env.local scripts/cli.mjs backup --compose-file docker/docker-compose.solo.yml
docker compose -f docker/docker-compose.solo.yml --env-file .env.local exec app /bin/sh
```

## Backup e restore

O CLI gera um diretório com dump do Postgres, snapshot do volume de
storage e um `manifest.json` com SHA-256 de cada componente.

### Gerar backup

**Com `make`:**
```bash
make backup
```

**Sem `make`:**
```bash
node --env-file=.env.local scripts/cli.mjs backup
```

Gera `./backups/taskflow-YYYYMMDD-HHMMSS/` com:
- `database.sql.gz` — pg_dump `--clean --if-exists`
- `storage.tar.gz` — tar do volume `taskflow-storage-data`
- `manifest.json` — versão, timestamp, hashes

Flags úteis:

**Com `make`:**
```bash
make backup OUT=./backups/pre-upgrade   # destino custom
make backup DB_ONLY=1                   # só o banco
make backup STORAGE_ONLY=1              # só storage
```

**Sem `make`:**
```bash
node --env-file=.env.local scripts/cli.mjs backup \
  --compose-file docker/docker-compose.solo.yml \
  --out ./backups/pre-upgrade
node --env-file=.env.local scripts/cli.mjs backup \
  --compose-file docker/docker-compose.solo.yml \
  --db-only
node --env-file=.env.local scripts/cli.mjs backup \
  --compose-file docker/docker-compose.solo.yml \
  --storage-only
```

### Restaurar

**Operacao destrutiva** - sobrescreve o DB e o volume de storage
inteiro. Precisa de `--yes` explicito (mesmo padrao do `user:delete`).

**Com `make`:**
```bash
# 1. Dry-run - valida manifest, hashes e mostra o que sera sobrescrito
make restore FROM=./backups/taskflow-20260416-120000

# 2. Aplica pra valer
make restore FROM=./backups/taskflow-20260416-120000 YES=1

# 3. Reinicia o app pra invalidar caches in-memory
docker restart taskflow-app
```

**Sem `make`:**
```bash
# 1. Dry-run
node --env-file=.env.local scripts/cli.mjs restore \
  --from ./backups/taskflow-20260416-120000 \
  --compose-file docker/docker-compose.solo.yml

# 2. Aplica pra valer
node --env-file=.env.local scripts/cli.mjs restore \
  --from ./backups/taskflow-20260416-120000 \
  --compose-file docker/docker-compose.solo.yml \
  --yes

# 3. Reinicia o app pra invalidar caches in-memory
docker restart taskflow-app
```

Se algum arquivo do backup estiver corrompido (hash diferente do manifest),
o restore aborta antes de tocar em qualquer coisa.

## Estrutura do .env.local

Principais variáveis (ver [configuration.md](./configuration.md) pra
lista completa):

```env
# Endpoints
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000      # nginx gateway
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Secrets (gerados por gen-secrets.sh)
JWT_SECRET=...                                      # 32 bytes hex
POSTGRES_PASSWORD=...
ENCRYPTION_KEY=...                                  # 32 bytes hex
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...            # JWT assinado
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Drivers (defaults do perfil solo)
AUTH_MODE=solo              # bypass de login
STORAGE_DRIVER=local-disk
REALTIME_DRIVER=pg-notify-sse
LLM_DRIVER=disabled         # descomente pra ligar (ollama/openai-compat)
EMAIL_DRIVER=disabled
VOICE_DRIVER=disabled
VCS_DRIVER=github
VCS_TOKEN_MODE=pat
OBS_DRIVER=console
```

## Habilitando features opcionais

### LLM via Ollama

Adicione ao `.env.local`:

```env
LLM_DRIVER=ollama
LLM_BASE_URL=http://ollama:11434
LLM_MODEL=llama3.1
```

E adicione o container Ollama ao compose (isso entra no perfil `team`
quando pronto).

### Email via SMTP

```env
EMAIL_DRIVER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password
SMTP_FROM=seu-email@gmail.com
```

### GitHub integration

No perfil solo usamos PATs (Personal Access Tokens) — o usuário cola em
Settings → GitHub. Alternativa: **instance PAT** (1 token global pra
todo o instance):

```env
VCS_TOKEN_MODE=instance-pat
VCS_INSTANCE_PAT=ghp_xxxxx...
```

## Rotacionar secrets

Se `JWT_SECRET` ou `ENCRYPTION_KEY` vazarem, use o CLI:

```bash
# Backup antes (obrigatorio)
node --env-file=.env.local scripts/cli.mjs backup

# So ENCRYPTION_KEY (re-encripta GitHub PATs, ~30s downtime)
node --env-file=.env.local scripts/cli.mjs token:rotate --encryption --yes

# So JWT_SECRET (invalida sessoes, rebuild necessario)
node --env-file=.env.local scripts/cli.mjs token:rotate --jwt --yes
docker compose -f docker/docker-compose.solo.yml --env-file .env.local build app
docker compose -f docker/docker-compose.solo.yml --env-file .env.local up -d --force-recreate

# Ambos de uma vez
node --env-file=.env.local scripts/cli.mjs token:rotate --all --yes
```

Detalhes completos em [modules/auth.md](./modules/auth.md#rotação-de-secrets).

## Troubleshooting rápido

| Sintoma | Causa provável |
|---|---|
| `make up` falha com "port 3000 in use" | Outro processo usando a porta — mude `ports` no compose |
| Container `bootstrap` em `Exited (1)` | Veja `make logs SERVICE=bootstrap` — provavelmente postgres não subiu |
| Login não funciona em `AUTH_MODE=solo` | Verifique `AUTH_MODE=solo`, `SOLO_USER_EMAIL` e o health de GoTrue em `make health` |
| App mostra "Connection refused" | nginx ainda não está healthy — espere mais uns segundos |

Mais em `troubleshooting.md` (em breve).

## Próximos passos

Depois de subir o solo:
- Leia [configuration.md](./configuration.md) pra entender cada env var
- Veja [modules/auth.md](./modules/auth.md) pra decidir se quer solo mode
  ou GoTrue tradicional
