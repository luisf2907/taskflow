# Supabase self-hosted — SQL e configs

Arquivos usados pelo stack self-hosted pra reproduzir o schema do Taskflow
em Postgres vazio. São diferentes das `supabase/migrations/` do repo
principal — aquelas refletem o histórico de evolução do schema (com drift
em relação ao ambiente de produção), enquanto os arquivos aqui são
**snapshots consolidados** do estado atual, gerados a partir de dump.

## Arquivos

### `bootstrap.sql`
Schema completo da aplicação, em arquivo único. Executado uma vez pelo
[`scripts/bootstrap.sh`](../../scripts/bootstrap.sh) no primeiro `docker
compose up`.

Seções:
1. **Extensions** — `vector` (obrigatório pra voice embeddings), `pgcrypto`
2. **Schema public** — 29 tabelas, 27 funções/RPCs, 9 triggers, 76 policies,
   64 indexes (derivado do `dump-public.sql` da produção)
3. **Storage buckets** — `wiki` (público 5MB imgs), `reunioes-audio`
   (privado 50MB audio/video), `anexos` (público 50MB any)
4. **Storage policies** — 7 policies em `storage.objects` pra buckets `wiki`
   e `reunioes-audio` (bucket `anexos` continua sem policies — replica
   comportamento de produção; ver nota em `TODO.md`)

Idempotente: `CREATE ... IF NOT EXISTS` e `CREATE OR REPLACE` são usados
onde possível. Policies usam `DROP POLICY IF EXISTS` antes de recriar.

### Arquivos não versionados
- `dump-public.sql`, `dump-storage.sql`, `dump-roles.sql` — dumps originais
  do Supabase Cloud que geraram o `bootstrap.sql`. Ficam na raiz do repo
  (gitignored). Regenerados com:
  ```bash
  supabase db dump --linked --schema public > dump-public.sql
  supabase db dump --linked --schema storage > dump-storage.sql
  ```

## Regenerando o bootstrap

Quando o schema de produção mudar, regenerar o `bootstrap.sql` é manual
(ainda não automatizado por script, vira [TODO](../../docs/self-hosting/TODO.md)):

1. Dumpar schema atual (ver comandos acima)
2. Substituir a seção 2 do `bootstrap.sql` pelo conteúdo novo de
   `dump-public.sql`, mantendo os comentários de seção
3. Se buckets ou storage policies mudaram, atualizar seções 3 e 4

## Execução em self-hosted

O arquivo é aplicado pela orquestração do Docker (ver
`docker-compose.solo.yml`). Ordem crítica:

1. Container `postgres` sobe
2. Container `gotrue` sobe e cria o schema `auth`
3. Container `storage-api` sobe e cria o schema `storage`
4. Container `bootstrap` (one-shot) aplica `bootstrap.sql` via `psql`
5. Container `app` sobe depois que bootstrap terminou

## Referências

- Schema original (drift): `supabase/migrations/*.sql`
- Setup do stack Docker: `docker/docker-compose.solo.yml`
- Script de bootstrap: `scripts/bootstrap.sh`
- Plano completo: `C:\Users\Luis Felipe\.claude\plans\curious-fluttering-crane.md`
