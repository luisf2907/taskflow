# Módulo: Realtime

Kanban sincroniza entre abas/usuários em tempo real quando algum altera
um card, coluna, comentário, etc. Isso é plugável via `REALTIME_DRIVER`.

## Drivers disponíveis

| Driver | Uso típico | Overhead |
|---|---|---|
| `supabase` | Cloud default | Container Realtime (Phoenix/Elixir, ~200 MB) |
| `pg-notify-sse` | Self-hosted solo/team | ~0 (roda no app Next, conexões pg nativas) |
| `polling` | Fallback degradado | SWR revalida a cada 10s |

## Como funciona (pg-notify-sse)

```
┌──────────────┐       ┌────────────┐       ┌──────────────┐
│ User A altera│──────▶│ Postgres   │       │ User B navega│
│ um card      │       │            │       │              │
└──────────────┘       │ AFTER      │       └──────┬───────┘
                       │ UPDATE     │              │
                       │ trigger    │              │
                       │ pg_notify  │              │
                       │ 'realtime' │              │
                       └──────┬─────┘              │
                              │ NOTIFY             │
                              ▼                    │
                       ┌────────────┐              │
                       │ Next app   │              │
                       │ LISTEN em  │              │
                       │ pg-listen  │              │
                       │   ↓        │              │
                       │ /api/      │  SSE         │
                       │ realtime   │──────────────▶
                       │ /board/X   │       event: cartoes
                       │            │       data: {"op":"UPDATE",...}
                       └────────────┘              │
                                                   ▼
                                            debouncedMutate(
                                              "cartoes-X"
                                            )
                                                   │
                                                   ▼
                                            SWR refetch → UI atualiza
```

**Vantagens:**
- Zero container adicional (postgres + Next.js já existem)
- Latência < 100ms (LISTEN/NOTIFY é in-process no Postgres)
- Autorização via RLS na API route (server nunca vaza evento de
  workspace que o user não participa)

**Limitações:**
- Não tem broadcast ephemeral (presença, cursores). Se precisar:
  `REALTIME_DRIVER=supabase` + rodar container Realtime.
- 1 conexão Postgres por SSE client. Perfil full com muitos users
  simultâneos pode querer um hub pubsub interno (otimização futura).

## Setup

### `pg-notify-sse` (default solo)

No `.env.local`:
```env
REALTIME_DRIVER=pg-notify-sse
POSTGRES_PASSWORD=...
POSTGRES_HOST=postgres       # hostname do container
POSTGRES_DB=taskflow
```

Triggers SQL já vêm no `supabase/self-hosted/bootstrap.sql` — aplicados
na primeira subida.

**Cloud que queira migrar pra pg-notify-sse**: aplica os triggers via
SQL Editor no Supabase Studio:
```sql
\i supabase/self-hosted/realtime-triggers.sql
-- ou copy-paste do conteúdo
```
E setar `REALTIME_DRIVER=pg-notify-sse` + `NEXT_PUBLIC_REALTIME_DRIVER=pg-notify-sse`
nas envs.

### `supabase`

Default cloud. Sem nada pra configurar além do projeto Supabase ter
Realtime habilitado (já vem por padrão).

Em self-hosted: requer container `supabase/realtime:v2.x` no
docker-compose + passar configs de DB. Fica pra perfil **full**.

### `polling`

Degradado mas funcional. Bom pra:
- Ambientes atrás de firewalls que bloqueiam long-lived connections
- Debug (exclui realtime como suspeito em bugs)

```env
REALTIME_DRIVER=polling
NEXT_PUBLIC_REALTIME_DRIVER=polling
```

Hooks ficam no-op; SWR usa `refreshInterval` global (default 10s) pra
revalidar queries. **Não implementado ainda** (próximo commit) — se
escolher agora, kanban só atualiza no F5.

## Observabilidade

### Ver eventos sendo emitidos

No container postgres:
```bash
docker compose exec postgres psql -U postgres -d taskflow -c "LISTEN realtime_events;"
# Fica aguardando. Em outra shell, faz um UPDATE e o notify aparece aqui.
```

### Ver SSE stream no browser

DevTools → Network → filtrar por "realtime" → abrir o request SSE → aba
"EventStream" mostra cada evento chegando em tempo real.

### Verificar conexões ativas

```bash
docker compose exec postgres psql -U postgres -d taskflow -c \
  "SELECT application_name, state, query FROM pg_stat_activity WHERE query LIKE '%LISTEN%';"
```

## Troubleshooting

### Kanban não atualiza entre abas

1. Confirma `NEXT_PUBLIC_REALTIME_DRIVER=pg-notify-sse` foi passada em
   **build time** (não só runtime). Rebuild do app se trocou:
   ```bash
   docker compose build app
   ```
2. Browser DevTools → Network → procura por `/api/realtime/board/...`:
   - Status deve ser `200` e ficar pendente (stream)
   - Se 401: sessão inválida, relogar
   - Se 404: quadro não existe ou user não é membro
3. No servidor, valida que triggers estão ativos:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname LIKE 'tg_realtime%';
   -- Deve listar: tg_realtime_cartoes, tg_realtime_colunas,
   -- tg_realtime_comentarios, tg_realtime_atividades, tg_realtime_quadros
   ```

### Conexão SSE fecha sozinha após ~1 min

- Proxy/firewall corporativo cortando long connections. Proxy com
  `proxy_read_timeout` baixo. Aumente no nginx:
  ```nginx
  proxy_read_timeout 3600;  # 1 hora
  ```
- Em self-hosted, já está no nginx.conf; se customizou, valide.

### Heartbeat não chega

SSE tem heartbeats de comentário (`: heartbeat <ts>\n\n`) a cada 30s
pra evitar timeouts. Se você vê no Network mas app não detecta: é
porque heartbeat é comment (inicia com `:`) — browser não dispara
event. Isso é correto, heartbeat serve só pra manter conexão viva.

### Error spam no console

Se `EventSource` disconnect e reconnect em loop: verificar logs do
app pra ver erro do lado do servidor:
```bash
docker compose logs app --tail 50 | grep -i realtime
```
Geralmente é `POSTGRES_PASSWORD` errado ou `POSTGRES_HOST` não resolve.

## Migração de driver

Trocar entre drivers em runtime **não é possível** — requer rebuild
(build args são inlined no bundle do cliente).

Procedimento:
1. Edita `.env.local`: novo `REALTIME_DRIVER` + `NEXT_PUBLIC_REALTIME_DRIVER`
2. `docker compose build app`
3. `docker compose up -d app`
4. Clear site data no browser (cookies de SSE velhos)
