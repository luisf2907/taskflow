# Setup do banco — Supabase Cloud

Guia pra configurar o banco de dados num projeto Supabase Cloud (sem Docker).

> **Importante:** As migrations em `supabase/migrations/` estão fora de sync
> (drift histórico). O schema consolidado e correto vive em
> `supabase/self-hosted/bootstrap.sql`, gerado a partir do dump de produção.

---

## Resumo

| Passo | O que roda | Onde |
|-------|-----------|------|
| 1 | Habilitar extensions | Dashboard → Database → Extensions |
| 2 | Schema público (tabelas, funções, RLS) | SQL Editor |
| 3 | Storage buckets | Dashboard → Storage |
| 4 | Storage policies | SQL Editor |
| 5 | Migrations recentes (045, 046) | SQL Editor |
| 6 | Habilitar Realtime nas tabelas | Dashboard → Database → Replication |

---

## Passo 1 — Extensions

No Dashboard do Supabase: **Database → Extensions**. Habilite:

- **vector** (pgvector) — obrigatória, usada pra voice embeddings
- **pgcrypto** — usada pelo GoTrue internamente

---

## Passo 2 — Schema público

Abra **SQL Editor** no Dashboard e rode o conteúdo das **seções 1 e 2** do
`supabase/self-hosted/bootstrap.sql` (linhas 24 até ~2614).

Isso cria todas as tabelas, indexes, constraints, functions, triggers e
RLS policies do schema `public`.

### Como encontrar as seções

```
-- Seção 1: Extensions (linha 24-31)     → JÁ FEZ no passo 1, pode pular
-- Seção 2: Schema public (linha 33-2614) → RODAR TUDO
-- Seção 3: Storage buckets (linha 2616)  → Passo 3 (Dashboard)
-- Seção 4: Storage policies (linha 2629) → Passo 4
-- Seção 5: Realtime triggers (linha 2687)→ NÃO RODAR (é pra self-hosted)
```

> **Dica:** copie as linhas 33 até 2614 e cole no SQL Editor. Se der erro
> em `ALTER TABLE ... OWNER TO "postgres"`, ignore — Supabase Cloud usa
> roles diferentes. As tabelas são criadas normalmente.

> **Se o SQL for grande demais pro editor:** divida em blocos (tabelas
> primeiro, depois indexes/constraints, depois functions/triggers, depois
> policies). Cada bloco roda independente.

---

## Passo 3 — Storage buckets

No Dashboard: **Storage → New bucket**. Crie 3 buckets:

| Nome | Público | Limite de tamanho | MIME types |
|------|---------|-------------------|------------|
| `wiki` | ✅ Sim | 5 MB | image/jpeg, image/png, image/gif, image/webp |
| `reunioes-audio` | ❌ Não | 50 MB | (todos) |
| `anexos` | ✅ Sim | 50 MB | (todos) |

---

## Passo 4 — Storage policies

No **SQL Editor**, rode a **seção 4** do `bootstrap.sql` (linhas 2629-2684).

São as policies RLS em `storage.objects` pra controlar quem pode
upload/delete em cada bucket. Inclui as policies do bucket `anexos`
(fix de segurança).

---

## Passo 5 — Migrations recentes

Ainda no **SQL Editor**, rode esses 2 arquivos na ordem:

### `supabase/migrations/045_anexos_storage_policies.sql`

Policies de segurança no bucket `anexos`. Se já rodou a seção 4 do
bootstrap.sql acima, essas policies já existem — o arquivo usa
`DROP POLICY IF EXISTS` e é seguro re-rodar.

### `supabase/migrations/046_perfis_must_change_password.sql`

Adiciona coluna `must_change_password` na tabela `perfis` (usada pelo
CLI `user:create` no modo team pra forçar troca de senha no primeiro
login).

```sql
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
```

---

## Passo 6 — Habilitar Realtime

O app usa Supabase Realtime (`postgres_changes`) pra atualizar o kanban,
notificações, planning poker, etc. em tempo real.

No Dashboard: **Database → Replication → supabase_realtime**

Habilite Realtime nestas **8 tabelas**:

| Tabela | Usado por |
|--------|-----------|
| `cartoes` | Kanban board (drag-drop, criar/editar cards) |
| `colunas` | Kanban board (criar/mover colunas) |
| `comentarios` | Comentários em cards (tempo real) |
| `quadros` | Lista de quadros no workspace |
| `atividades` | Feed de atividades do board/workspace |
| `notificacoes` | Sino de notificações do user |
| `poker_sessoes` | Planning poker (sessão ativa) |
| `poker_votos` | Planning poker (votos em tempo real) |

> **Como:** clique no toggle de cada tabela na lista. Não precisa
> selecionar eventos específicos — habilite todos (INSERT, UPDATE, DELETE).

---

## Verificação

Depois de rodar tudo:

1. **Tabelas:** No Dashboard → Table Editor, confirme que `workspaces`,
   `quadros`, `cartoes`, `perfis`, etc. existem.

2. **RLS:** Em Authentication → Policies, confirme que as tabelas têm
   policies (ex: `cartoes_all`, `quadros_select_workspace`, etc.).

3. **Storage:** Em Storage, confirme os 3 buckets existem.

4. **Realtime:** Em Database → Replication, confirme as 8 tabelas
   com toggle ativo.

5. **App:** Rode `npm run dev` e acesse `http://localhost:3000`.
   Crie um workspace + quadro + cartão. Abra em 2 abas — mover
   card em uma deve refletir na outra em <1 segundo.

---

## Atualizações futuras

Quando o schema mudar, novas migrations serão adicionadas em
`supabase/migrations/`. Rode no SQL Editor do Dashboard na ordem.
O `bootstrap.sql` será atualizado periodicamente como snapshot
consolidado.
