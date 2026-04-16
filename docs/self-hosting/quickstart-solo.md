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

```bash
make setup
```

Isso cria `.env.local` a partir de `.env.solo.example` e anexa secrets
seguros gerados por `scripts/gen-secrets.sh` (JWT, senhas, chave de
criptografia).

> **Importante:** `ENCRYPTION_KEY` e `JWT_SECRET` **não devem ser
> rotacionados** depois de o stack ter sido usado. Rotate
> `ENCRYPTION_KEY` invalida GitHub PATs salvos; rotate `JWT_SECRET`
> invalida sessões ativas. Se precisar, há comandos dedicados de
> rotação (ver [TODO.md](./TODO.md)).

### 3. Suba o stack

```bash
make up
```

Isso faz `docker compose -f docker/docker-compose.solo.yml up -d`. Na
primeira vez o build do app leva ~2 minutos. Acompanhe:

```bash
make logs
```

### 4. Aguarde o bootstrap terminar

O container `taskflow-bootstrap` aplica o schema e sai com sucesso. Os
outros serviços dependem dele. Veja com:

```bash
make ps
```

Espere todos ficarem `healthy` ou `running`. O container `bootstrap`
deve ficar em `Exited (0)` — isso é o comportamento correto.

### 5. Crie o admin

*Pendente — Fase 2 do plano implementa a CLI.*

Por enquanto, você pode criar manualmente via SQL:

```bash
docker compose -f docker/docker-compose.solo.yml exec postgres \
  psql -U postgres -d taskflow -c "
  -- TODO: procedimento de criação de admin vai aqui quando a CLI
  -- estiver pronta. Por hora, use a UI depois de habilitar signup
  -- temporariamente.
  "
```

### 6. Abra o app

```
http://localhost:3000
```

## Comandos úteis

```bash
make logs              # segue logs de todos
make logs SERVICE=app  # logs de um serviço específico
make ps                # status
make down              # derruba (mantém dados)
make clean             # APAGA TUDO (postgres + storage)
make rebuild           # rebuild só da imagem do app
make backup            # pg_dump pro .sql local
make shell SERVICE=app # entra no container
```

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

## Troubleshooting rápido

| Sintoma | Causa provável |
|---|---|
| `make up` falha com "port 3000 in use" | Outro processo usando a porta — mude `ports` no compose |
| Container `bootstrap` em `Exited (1)` | Veja `make logs SERVICE=bootstrap` — provavelmente postgres não subiu |
| Login não funciona em `AUTH_MODE=solo` | Ainda não há `/api/health` nem auto-login implementado. Aguardando Fase 2 |
| App mostra "Connection refused" | nginx ainda não está healthy — espere mais uns segundos |

Mais em `troubleshooting.md` (em breve).

## Próximos passos

Depois de subir o solo:
- Leia [configuration.md](./configuration.md) pra entender cada env var
- Veja [modules/auth.md](./modules/auth.md) pra decidir se quer solo mode
  ou GoTrue tradicional
