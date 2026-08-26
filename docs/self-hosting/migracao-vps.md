# Migração entre VPS (Supabase self-hosted → Supabase self-hosted)

Como mover **todos** os dados de uma instância Supabase self-hosted para
outra: schema `public` (dados da aplicação), schema `auth` (usuários e
senhas) e schema `storage` + os bytes dos arquivos no MinIO.

Cenário assumido: origem no Coolify (container `supabase-db-<hash>`, banco
`postgres`, superusuário `supabase_admin`, storage em MinIO); destino já
provisionado e vazio.

> **Por que não `scripts/cli.mjs restore`:** aquele comando tem
> `psql -U postgres -d taskflow` fixo em `restoreDatabase()`
> ([restore.mjs:215](../../scripts/cli/restore.mjs:215)) — serve para a stack
> própria do repo, não para o Supabase oficial, onde o banco chama `postgres`
> e o `postgres` não é superusuário. Nesta migração use `psql` direto.

---

## Antes de começar: os 3 segredos que precisam viajar junto

Estes **não** estão no dump. Se forem diferentes no destino, o restore
"funciona" e os dados aparecem quebrados depois:

| Variável | O que quebra se mudar | Recuperável? |
|----------|----------------------|--------------|
| `ENCRYPTION_KEY` | `github_tokens.encrypted_token` vira lixo indecifrável (AES-256-GCM, [crypto.ts](../../src/lib/crypto.ts)) | ❌ Não — só reconectando o GitHub de novo |
| `JWT_SECRET` (+ `ANON_KEY`, `SERVICE_ROLE_KEY` derivadas dele) | Todas as sessões caem e o app precisa de env nova | ✅ Sim — regerar e atualizar o app |
| `STORAGE_S3_ACCESS_KEY` / `SECRET_KEY` | storage-api não lê o MinIO | ✅ Sim — realinhar as duas pontas |

**Recomendação:** copie os três idênticos da origem para o destino. Assim o
app nem percebe a troca, e ninguém precisa relogar. Se você *quiser* rotacionar
a `ENCRYPTION_KEY`, faça isso **depois** da migração, com
`scripts/cli.mjs token:rotate --encryption --yes`, que redescriptografa
e regrava os tokens.

---

## Fase 0 — Diagnóstico (rode nas DUAS VPS)

Você precisa dos nomes reais dos containers e do caminho do MinIO antes de
qualquer comando destrutivo.

```bash
docker ps --format '{{.Names}}\t{{.Image}}'
```

Anote, de cada lado: o container do Postgres, do `gotrue`/`auth`, do
`storage-api`, do `minio` e do app.

Descubra onde o MinIO guarda os bytes:

```bash
docker inspect <container-minio> --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}'
```

**Confira as versões das imagens nos dois lados.** O dump traz
`auth.schema_migrations` e `storage.migrations` junto; restaurar o estado de
migração da origem por cima de um GoTrue/storage-api mais novo no destino é a
principal causa de restore que passa e serviço que não sobe. Se divergirem,
fixe as tags do destino nas mesmas da origem antes de continuar.

---

## Fase 1 — Congelar escritas na origem

O dump do banco e o snapshot do storage precisam ser do mesmo instante. Uma
linha em `storage.objects` sem o arquivo correspondente é anexo quebrado.

```bash
docker stop <container-do-app>
```

Pare também qualquer worker (`voice-worker`, cron). Deixe Postgres, MinIO e
storage-api de pé — eles são a fonte do backup.

---

## Fase 2 — Dump do banco (na origem)

```bash
mkdir -p /root/migracao

docker exec <container-db-origem> pg_dump \
  -U supabase_admin -d postgres \
  -n public -n auth -n storage \
  --clean --if-exists --quote-all-identifiers \
  | gzip -9 > /root/migracao/database.sql.gz
```

Confira que o arquivo tem tamanho plausível — `pg_dump` que falha no meio de
um pipe ainda deixa arquivo, só que minúsculo:

```bash
ls -lh /root/migracao/database.sql.gz
```

**Só três schemas, de propósito.** O Supabase cria `_realtime`, `_analytics`,
`extensions`, `graphql`, `pgbouncer`, `vault` e outros que uma instalação nova
recria sozinha. Restaurar por cima gera conflito sem trazer dado seu.

**Sem `--no-owner`:** os `OWNER TO` e `GRANT` do dump apontam para
`supabase_admin`, `authenticated`, `anon`, `service_role` — roles que já
existem numa instalação Supabase nova. Manter isso é o que faz as policies de
RLS pousarem certas do outro lado.

---

## Fase 3 — Cópia dos arquivos do MinIO

O dump trouxe as **linhas** de `storage.objects`; falta trazer os **bytes**.

### Primeiro: descubra o layout real

O nome dos buckets no MinIO depende de qual driver o app usa. Cheque a env da
origem:

```bash
grep STORAGE_DRIVER .env    # ou: docker exec <app> printenv STORAGE_DRIVER
mc alias set origem http://localhost:9000 <ACCESS_KEY_ORIG> <SECRET_ORIG>
mc ls origem
```

| `STORAGE_DRIVER` | Quem escreve no MinIO | Layout |
|------------------|----------------------|--------|
| `supabase` | storage-api do Supabase | **Um único** bucket S3 (o `GLOBAL_S3_BUCKET` do storage-api), com as chaves prefixadas por `anexos/`, `wiki/`, `reunioes-audio/` |
| `s3-compat` | O próprio app ([s3.ts](../../src/lib/drivers/storage/s3.ts)) | **Três** buckets: `STORAGE_S3_BUCKET_PREFIX` + nome — por padrão `taskflow-anexos`, `taskflow-wiki`, `taskflow-reunioes-audio` |

O `mc ls origem` te dá a resposta definitiva. Use os nomes que aparecerem ali
nos comandos abaixo — não os do exemplo.

### Opção A — `mc mirror` (recomendada)

Trabalha pela API S3, então não encosta no `.minio.sys` do destino nem exige
que as credenciais root batam.

```bash
mc alias set destino https://<minio-do-destino> <ACCESS_KEY_DEST> <SECRET_DEST>

# Repita para cada bucket que o `mc ls origem` listou:
mc mb --ignore-existing destino/<bucket>
mc mirror --overwrite origem/<bucket> destino/<bucket>
```

Se `STORAGE_DRIVER=supabase`, é um bucket só — e o bucket do destino precisa
ter **o mesmo nome** do `GLOBAL_S3_BUCKET` configurado no storage-api de lá,
senão ele procura os arquivos no lugar errado.

Se o MinIO do destino não estiver exposto pra internet, faça em dois saltos:
`mc mirror origem/<bucket> /root/migracao/storage/` na origem, `rsync` da
pasta (Fase 4), e depois `mc mirror /root/migracao/storage/ destino/<bucket>`
rodando no destino.

### Opção B — tar do diretório do bucket (mais simples, e a testada)

Funciona porque o Coolify usa bind mount: os bytes já estão num diretório do
host. **Empacote apenas o diretório do bucket, nunca o volume inteiro** — o
`.minio.sys` guarda o registro dos buckets e as credenciais internas do MinIO
de origem, e sobrescrever o do destino com ele quebra a instância de lá.

```bash
# Na origem — só o bucket, sem o .minio.sys:
tar czf /root/migracao/storage.tar.gz -C /data/coolify/services/<hash>/volumes/storage stub

# No destino — MinIO parado durante a extração:
docker stop supabase-minio-<hash>
tar xzf /root/migracao/storage.tar.gz -C /data/coolify/services/<hash>/volumes/storage
docker start supabase-minio-<hash>
```

O destino mantém o `.minio.sys` dele, que já tem o bucket `stub` registrado
(o storage-api cria no primeiro boot) — a gente só deposita os objetos dentro.
Confirme que `<volumes/storage>/stub` existe no destino antes de extrair.

Pare o MinIO antes: escrever nos arquivos dele com o processo vivo corrompe
índice.

Compare com [scripts/backup-supabase.sh](../../scripts/backup-supabase.sh), que
arquiva o volume inteiro — apropriado para *backup* da mesma instância, não
para transplante entre instâncias.

---

## Fase 4 — Transferência

Direto entre as VPS, sem passar pela sua máquina:

```bash
# Da origem:
rsync -avz --progress /root/migracao/ root@<ip-destino>:/root/migracao/
```

Gere as somas antes e confira depois — a migração inteira depende desses
arquivos:

```bash
# Origem:
cd /root/migracao && sha256sum ./* > SHA256SUMS

# Destino:
cd /root/migracao && sha256sum -c SHA256SUMS
```

---

## Fase 5 — Restore no destino

**1. Pare os serviços que escrevem nesses schemas.** GoTrue e storage-api
mexendo nas próprias tabelas durante o restore é conflito certo:

```bash
docker stop <app> <gotrue> <storage-api> <realtime> <postgrest>
```

**2. Resolva as extensions — e cuidado com a ordem.** Extensions vivem fora dos
três schemas dumpados, então não vêm no arquivo. Descubra o que falta comparando
os dois lados:

```bash
docker exec <db> psql -U supabase_admin -d postgres -c 'select extname from pg_extension order by 1'
```

Num Supabase self-hosted típico a única ausente no destino é a `vector`, criada
pelo `bootstrap.sql` do taskflow.

**Não dá para simplesmente criá-la antes do restore.** O dump emite
`DROP SCHEMA IF EXISTS "public";` seguido de `CREATE SCHEMA "public";`, e a
extension mora justamente em `public` (o dump referencia `"public"."vector"` na
função `match_voice_profiles`). Isso trava nos dois sentidos:

- Criando **antes** → o `DROP SCHEMA "public"` falha, porque sem `CASCADE` não
  se dropa schema que ainda tem objetos
- **Sem** criar → o `CREATE FUNCTION ... "public"."vector"` falha com
  `type "public.vector" does not exist`

A saída é injetar o `CREATE EXTENSION` **dentro** do fluxo do dump, logo após o
`CREATE SCHEMA "public"` e antes de qualquer objeto que use o tipo. Um `sed` no
meio do pipe faz isso sem alterar o arquivo:

**3. Aplique o dump:**

```bash
zcat /root/migracao/database.sql.gz | sed 's|^CREATE SCHEMA "public";|CREATE SCHEMA "public";\nCREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA "public";|' | docker exec -i <container-db-destino> psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 --quiet > /root/migracao/restore.log 2>&1; echo "exit=$?"
```

`ON_ERROR_STOP=1` aborta no primeiro erro em vez de deixar um banco pela
metade. Se parar, o `restore.log` diz exatamente onde — corrija e rode de novo
(o dump tem `DROP ... IF EXISTS` em tudo, então repetir é seguro).

> Confirme em qual schema a extension realmente está antes de copiar o comando
> acima — se o dump referenciar `"extensions"."vector"`, troque o `WITH SCHEMA`.
> Para descobrir sem acesso à origem, basta olhar o próprio dump:
> `zcat database.sql.gz | grep -o '"[a-z]*"\."vector"' | sort -u`

**4. Suba os serviços de volta:**

```bash
docker start <postgrest> <gotrue> <storage-api> <realtime> <app>
```

**5. Recrie a publication do Realtime.** Este passo é fácil de esquecer porque
nada dá erro sem ele: o WebSocket conecta, autentica, e simplesmente nunca
recebe evento nenhum.

Publications são objetos de **banco**, não de schema — `pg_dump -n public` não
as inclui, e o `DROP SCHEMA "public"` do restore ainda remove do destino
qualquer tabela que já estivesse publicada. Resultado: `supabase_realtime`
chega do outro lado existindo e **vazia**.

Compare os dois lados:

```bash
docker exec <db> psql -U supabase_admin -d postgres -c "select p.pubname, count(t.tablename) from pg_publication p left join pg_publication_tables t on t.pubname=p.pubname group by 1 order by 1"
```

Gere o SQL a partir da **origem** — não copie a lista das migrations. O
`CLAUDE.md` avisa que elas estão fora de sync por drift histórico, e na prática
isso se confirma (uma instalação real publicava 11 das 12 tabelas que as
migrations mandam adicionar):

```bash
docker exec <db-origem> psql -U supabase_admin -d postgres -tAc "select 'ALTER PUBLICATION supabase_realtime ADD TABLE '||quote_ident(schemaname)||'.'||quote_ident(tablename)||';' from pg_publication_tables where pubname='supabase_realtime' order by tablename"
```

Aplique a saída no destino e **reinicie o container do Realtime** — ele mantém
um slot de replicação aberto que só reflete a lista de tabelas vigente na
criação do slot.

Ignore o `supabase_realtime_messages_publication`: são partições diárias de
`realtime.messages` que o próprio serviço cria e recicla, e a contagem diverge
entre instâncias sem significar nada.

Confira também o `REPLICA IDENTITY`, que o `pg_dump` carrega junto da tabela mas
vale validar — sem `FULL`, eventos de `UPDATE`/`DELETE` chegam sem os dados da
linha antiga:

```bash
docker exec <db> psql -U supabase_admin -d postgres -c "select c.relname, c.relreplident from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relreplident<>'d' order by 1"
```

---

## Fase 6 — Env do destino

Além dos três segredos do topo, ajuste o que é específico do endereço novo:

| Variável | Ação |
|----------|------|
| `NEXT_PUBLIC_SITE_URL` | Domínio novo do app |
| `NEXT_PUBLIC_SUPABASE_URL` | URL externa do Supabase novo |
| `SITE_URL` / `ADDITIONAL_REDIRECT_URLS` (GoTrue) | Domínio novo, senão o login redireciona pro servidor velho |
| `SMTP_*` | Revise — VPS nova costuma ter IP sem reputação |

Se `NEXT_PUBLIC_*` mudou, **o app precisa de rebuild**, não só restart: essas
variáveis são inlinadas no bundle client em build time
(ver [upgrade.md](upgrade.md)).

**OAuth do GitHub:** o Authorization callback URL no GitHub OAuth App aponta
pro domínio do *Supabase*, não do app — `https://<supabase-novo>/auth/v1/callback`
([DEPLOYMENT.md:57](../../DEPLOYMENT.md:57)). Sem atualizar isso, login social
quebra mesmo com o banco perfeito.

---

## Fase 7 — Verificação

**Contagem de linhas — rode nos dois lados e compare:**

```sql
SELECT 'auth.users' AS tabela, count(*) FROM auth.users
UNION ALL SELECT 'perfis',           count(*) FROM public.perfis
UNION ALL SELECT 'workspaces',       count(*) FROM public.workspaces
UNION ALL SELECT 'quadros',          count(*) FROM public.quadros
UNION ALL SELECT 'cartoes',          count(*) FROM public.cartoes
UNION ALL SELECT 'comentarios',      count(*) FROM public.comentarios
UNION ALL SELECT 'wiki_paginas',     count(*) FROM public.wiki_paginas
UNION ALL SELECT 'anexos',           count(*) FROM public.anexos
UNION ALL SELECT 'storage.objects',  count(*) FROM storage.objects
ORDER BY 1;
```

**Bytes x linhas** — o total de objetos no MinIO tem que bater com
`storage.objects`:

```bash
mc ls --recursive destino/<bucket> | wc -l
```

**Checklist funcional**, na ordem em que as coisas costumam falhar:

1. Login com e-mail/senha de um usuário existente
2. Login social (GitHub) — valida o callback da Fase 6
3. Abrir um cartão com anexo e **baixar** o arquivo — valida storage ponta a ponta
4. Abrir uma página da wiki com imagem
5. Mover um cartão com outra aba aberta — valida realtime
6. `node --env-file=.env.local scripts/cli.mjs health`

---

## Rollback

A origem continua intacta o tempo todo — nada nesta migração escreve nela
além do `docker stop` da Fase 1. Se o destino não passar na Fase 7, é só
subir o app da origem de volta e tentar de novo:

```bash
docker start <container-do-app>   # na VPS de origem
```

Por isso vale **não** desligar nem cancelar a VPS antiga até o destino rodar
alguns dias em produção.
