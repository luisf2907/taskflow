-- Tabela de automações de workflow
create table if not exists automacoes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nome text not null default '',
  trigger_tipo text not null,
  trigger_config jsonb not null default '{}',
  acao_tipo text not null,
  acao_config jsonb not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Índice para busca por workspace
create index if not exists idx_automacoes_workspace on automacoes(workspace_id);

-- RLS
alter table automacoes enable row level security;

-- Membros do workspace podem ver automações
create policy "Membros podem ver automacoes"
  on automacoes for select
  using (is_workspace_member(workspace_id));

-- Membros podem criar/editar/excluir automações
create policy "Membros podem gerenciar automacoes"
  on automacoes for insert
  with check (is_workspace_member(workspace_id));

create policy "Membros podem atualizar automacoes"
  on automacoes for update
  using (is_workspace_member(workspace_id));

create policy "Membros podem excluir automacoes"
  on automacoes for delete
  using (is_workspace_member(workspace_id));
