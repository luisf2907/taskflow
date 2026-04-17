# Upgrade

Como atualizar o Taskflow self-hosted quando sair versão nova.

## Procedimento padrão

```bash
# 1. Backup antes de qualquer coisa
node --env-file=.env.local scripts/cli.mjs backup

# 2. Pull das mudanças
git pull origin feat/self-hosted

# 3. Instalar dependências novas (se houver)
npm install

# 4. Rebuild da imagem do app
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local build app

# 5. Subir stack (bootstrap re-aplica migrations idempotentes automaticamente)
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d

# 6. Validar
node --env-file=.env.local scripts/cli.mjs health
```

## O que o bootstrap faz no upgrade

O container `bootstrap` roda toda vez que a stack sobe. Se o schema já
existe (`public.workspaces` presente), ele:

1. **Pula** o `bootstrap.sql` completo (evita conflitos com indexes/constraints)
2. **Re-aplica** `realtime-triggers.sql` (idempotente, `CREATE OR REPLACE`)
3. **Re-aplica** migrations listadas em `UPGRADE_MIGRATIONS` no `bootstrap.sh`:
   - `045_anexos_storage_policies.sql`
   - `046_perfis_must_change_password.sql`

Novas migrations idempotentes são adicionadas à lista conforme versões
saem — o admin não precisa aplicar manualmente.

## Quando rebuild é necessário

| Mudança | Precisa rebuild? | Por quê |
|---------|-----------------|---------|
| Código em `src/` | ✅ Sim | Next.js standalone compila tudo no build |
| `docker-compose.yml` | ❌ Não | Basta `up -d --force-recreate` |
| `.env.local` (runtime envs) | ❌ Não | Basta `up -d --force-recreate` |
| `.env.local` (NEXT_PUBLIC_*) | ✅ Sim | Inlinadas no bundle client em build time |
| `nginx.conf` | ❌ Não | `up -d --force-recreate nginx` |
| `bootstrap.sql` | ❌ Não | Bootstrap re-roda no próximo `up` |
| `package.json` (deps novas) | ✅ Sim | deps entram na imagem |

## Usando imagens publicadas (GHCR)

Se imagens estão publicadas no GitHub Container Registry, o upgrade
é mais rápido (sem build local):

```bash
# 1. Backup
node --env-file=.env.local scripts/cli.mjs backup

# 2. Pull da imagem nova
docker pull ghcr.io/luisf2907/taskflow-app:latest

# 3. Trocar 'build:' por 'image:' no compose (uma vez):
#   app:
#     image: ghcr.io/luisf2907/taskflow-app:latest
#     # build: ...  (comentar)

# 4. Subir
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d
```

## Envs novas

Se uma versão nova introduz env vars obrigatórias, o app vai falhar no
boot com mensagem de validação Zod (em `src/lib/env.ts`). Cheque o
`.env.<profile>.example` atualizado pra ver o que mudou e adicione no
seu `.env.local`.

## Rollback

Se algo deu errado:

```bash
# Restaurar backup
node --env-file=.env.local scripts/cli.mjs restore --from ./backups/taskflow-<ts> --yes

# Voltar pra versão anterior do código
git checkout <commit-anterior>
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local build app
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d
```

## Breaking changes entre versões

Documentados no CHANGELOG do release. Itens que exigem ação manual:

- **Env renomeada:** atualize `.env.local`
- **Migration nova não-idempotente:** rode manualmente via SQL Editor ou
  `docker exec -i taskflow-postgres psql -U postgres -d taskflow -f /migrations/<file>`
- **NEXT_PUBLIC_* nova:** adicione no `.env.local` + rebuild app
