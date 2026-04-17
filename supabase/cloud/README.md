# Setup do banco — Supabase Cloud

Guia pra configurar o banco de dados num projeto Supabase Cloud (sem Docker).

> **Importante:** As migrations em `supabase/migrations/` estão fora de sync
> (drift histórico). Os arquivos nesta pasta (`supabase/cloud/`) são extraídos
> do `supabase/self-hosted/bootstrap.sql` (fonte de verdade, dump de produção)
> e estão prontos pra colar no SQL Editor.

---

## Arquivos (rodar na ordem)

```
supabase/cloud/
├── 01-extensions.sql                        # Extensions (pgvector, pgcrypto)
├── 02-schema.sql                            # Schema público inteiro (~2580 linhas)
├── 03-storage-buckets.sql                   # Cria 3 buckets (wiki, reunioes-audio, anexos)
├── 04-storage-policies.sql                  # RLS em storage.objects (todos os buckets)
├── 05-migration-045-anexos-policies.sql     # Fix segurança bucket anexos
├── 06-migration-046-must-change-password.sql # Coluna must_change_password em perfis
└── README.md                                # Este guia
```

## Resumo

| Passo | Arquivo | Onde rodar |
|-------|---------|------------|
| 1 | `01-extensions.sql` | Dashboard → Database → Extensions (ou SQL Editor) |
| 2 | `02-schema.sql` | SQL Editor |
| 3 | `03-storage-buckets.sql` | Dashboard → Storage (ou SQL Editor) |
| 4 | `04-storage-policies.sql` | SQL Editor |
| 5 | `05-migration-045-*.sql` | SQL Editor |
| 6 | `06-migration-046-*.sql` | SQL Editor |
| 7 | Habilitar Realtime | Dashboard → Database → Replication |

---

## Passo 1 — Extensions

**Arquivo:** `01-extensions.sql`

No Dashboard: **Database → Extensions**. Habilite:

- **vector** (pgvector) — obrigatória, usada pra voice embeddings
- **pgcrypto** — usada pelo GoTrue internamente

Ou cole o conteúdo de `01-extensions.sql` no SQL Editor.

---

## Passo 2 — Schema público

**Arquivo:** `02-schema.sql` (~2580 linhas)

Abra **SQL Editor** no Dashboard e cole o conteúdo inteiro do arquivo.
Isso cria todas as tabelas, indexes, constraints, functions, triggers e
RLS policies do schema `public`.

> **Se der erro em `ALTER TABLE ... OWNER TO "postgres"`:** ignore —
> Supabase Cloud usa roles diferentes. As tabelas são criadas normalmente.

> **Se o SQL for grande demais pro editor:** divida em blocos (copie
> metade, rode, copie o resto, rode). Cada statement é independente.

---

## Passo 3 — Storage buckets

**Arquivo:** `03-storage-buckets.sql`

Opção A — **Dashboard:** Storage → New bucket. Crie 3:

| Nome | Público | Limite | MIME types |
|------|---------|--------|------------|
| `wiki` | ✅ Sim | 5 MB | image/jpeg, image/png, image/gif, image/webp |
| `reunioes-audio` | ❌ Não | 50 MB | (todos) |
| `anexos` | ✅ Sim | 50 MB | (todos) |

Opção B — Cole `03-storage-buckets.sql` no SQL Editor.

---

## Passo 4 — Storage policies

**Arquivo:** `04-storage-policies.sql`

Cole no SQL Editor. São as policies RLS em `storage.objects` pra
controlar quem pode upload/delete em cada bucket (wiki, reunioes-audio,
anexos). Inclui o fix de segurança do bucket `anexos`.

---

## Passo 5 — Migrations

Cole no SQL Editor, **na ordem**:

**Arquivo:** `05-migration-045-anexos-policies.sql`

Policies extras do bucket `anexos`. Se já rodou o passo 4, essas
já existem — `DROP POLICY IF EXISTS` torna seguro re-rodar.

**Arquivo:** `06-migration-046-must-change-password.sql`

Adiciona coluna `must_change_password` na tabela `perfis`.

---

## Passo 6 — Habilitar Realtime (sem arquivo, via Dashboard)

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
