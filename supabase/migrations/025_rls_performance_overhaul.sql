-- =============================================
-- 025: RLS PERFORMANCE OVERHAUL
-- =============================================
-- Problemas resolvidos:
--   1. Policies "_all USING(true)" anulam TODA a seguranca (OR entre permissive policies)
--   2. Subqueries N+1 aninhadas em 3-4 niveis (cartao → coluna → quadro → ws_usuarios)
--   3. cartoes.workspace_id NULL em sprint cards forca OR com JOINs profundos
--   4. checklist_itens precisa subir 3 niveis (item → checklist → cartao → ws)
--
-- Estrategia:
--   A. workspace_id SEMPRE preenchido em cartoes (backfill + NOT NULL)
--   B. my_workspace_ids() STABLE SECURITY DEFINER = cache por transacao
--   C. Policies flat: workspace_id IN (SELECT my_workspace_ids())
--   D. Child tables: 1 nivel de JOIN max (via cartao_id → cartoes.workspace_id)
-- =============================================

BEGIN;

-- =============================================
-- PASSO 1: Garantir funcoes helper otimizadas
-- =============================================

-- my_workspace_ids() - STABLE permite cache do resultado dentro da transacao
-- O Postgres NAO re-executa a cada row se o resultado ja foi computado
CREATE OR REPLACE FUNCTION public.my_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_usuarios WHERE user_id = auth.uid();
$$;

-- is_workspace_member() - usa my_workspace_ids() internamente
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- is_workspace_admin() - STABLE para cache
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
    AND papel = 'admin'
  );
$$;

-- =============================================
-- PASSO 2: Backfill workspace_id em cartoes de sprint (que estao NULL)
-- Caminho: cartao.coluna_id → colunas.quadro_id → quadros.workspace_id
-- =============================================

UPDATE cartoes c
SET workspace_id = q.workspace_id
FROM colunas col
JOIN quadros q ON q.id = col.quadro_id
WHERE c.coluna_id = col.id
  AND c.workspace_id IS NULL
  AND q.workspace_id IS NOT NULL;

-- Verificar se ainda resta algum orfao (sem workspace_id e sem coluna)
-- Se existir, deletar pois sao dados invalidos
DELETE FROM cartoes WHERE workspace_id IS NULL AND coluna_id IS NULL;

-- Agora garantir NOT NULL (com default temporario para seguranca)
-- Nao adicionar NOT NULL se ainda houver rows com NULL (cards em quadros sem workspace)
-- Primeiro limpar quadros sem workspace
UPDATE quadros SET workspace_id = (
  SELECT workspace_id FROM workspace_usuarios LIMIT 1
) WHERE workspace_id IS NULL;

-- Re-rodar backfill apos fix de quadros
UPDATE cartoes c
SET workspace_id = q.workspace_id
FROM colunas col
JOIN quadros q ON q.id = col.quadro_id
WHERE c.coluna_id = col.id
  AND c.workspace_id IS NULL;

-- Adicionar constraint NOT NULL
ALTER TABLE cartoes ALTER COLUMN workspace_id SET NOT NULL;

-- Index para workspace_id em cartoes (essencial para as novas policies)
CREATE INDEX IF NOT EXISTS idx_cartoes_workspace_id ON cartoes(workspace_id);

-- =============================================
-- PASSO 3: Dropar TODAS as policies existentes (limpar o estado)
-- =============================================

-- workspaces
DROP POLICY IF EXISTS "workspaces_all" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

-- workspace_usuarios
DROP POLICY IF EXISTS "ws_usuarios_all" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_select" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_insert" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_update" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_delete" ON workspace_usuarios;

-- quadros
DROP POLICY IF EXISTS "quadros_all" ON quadros;
DROP POLICY IF EXISTS "quadros_select" ON quadros;
DROP POLICY IF EXISTS "quadros_insert" ON quadros;
DROP POLICY IF EXISTS "quadros_update" ON quadros;
DROP POLICY IF EXISTS "quadros_delete" ON quadros;

-- colunas
DROP POLICY IF EXISTS "colunas_all" ON colunas;
DROP POLICY IF EXISTS "colunas_select" ON colunas;
DROP POLICY IF EXISTS "colunas_insert" ON colunas;
DROP POLICY IF EXISTS "colunas_update" ON colunas;
DROP POLICY IF EXISTS "colunas_delete" ON colunas;

-- cartoes
DROP POLICY IF EXISTS "cartoes_all" ON cartoes;
DROP POLICY IF EXISTS "cartoes_select" ON cartoes;
DROP POLICY IF EXISTS "cartoes_insert" ON cartoes;
DROP POLICY IF EXISTS "cartoes_update" ON cartoes;
DROP POLICY IF EXISTS "cartoes_delete" ON cartoes;

-- etiquetas
DROP POLICY IF EXISTS "etiquetas_all" ON etiquetas;

-- cartao_etiquetas
DROP POLICY IF EXISTS "cartao_etiquetas_all" ON cartao_etiquetas;

-- membros
DROP POLICY IF EXISTS "membros_all" ON membros;

-- cartao_membros
DROP POLICY IF EXISTS "cartao_membros_all" ON cartao_membros;

-- checklists
DROP POLICY IF EXISTS "checklists_all" ON checklists;

-- checklist_itens
DROP POLICY IF EXISTS "checklist_itens_all" ON checklist_itens;

-- comentarios
DROP POLICY IF EXISTS "comentarios_all" ON comentarios;

-- anexos
DROP POLICY IF EXISTS "anexos_all" ON anexos;

-- notificacoes
DROP POLICY IF EXISTS "notificacoes_all" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes;

-- atividades
DROP POLICY IF EXISTS "atividades_all" ON atividades;
DROP POLICY IF EXISTS "atividades_select" ON atividades;
DROP POLICY IF EXISTS "atividades_insert" ON atividades;
DROP POLICY IF EXISTS "atividades_delete" ON atividades;

-- automacoes
DROP POLICY IF EXISTS "automacoes_all" ON automacoes;
DROP POLICY IF EXISTS "Membros podem ver automacoes" ON automacoes;
DROP POLICY IF EXISTS "Membros podem gerenciar automacoes" ON automacoes;
DROP POLICY IF EXISTS "Membros podem atualizar automacoes" ON automacoes;
DROP POLICY IF EXISTS "Membros podem excluir automacoes" ON automacoes;

-- automacao_logs
DROP POLICY IF EXISTS "automacao_logs_all" ON automacao_logs;
DROP POLICY IF EXISTS "automacao_logs_select" ON automacao_logs;
DROP POLICY IF EXISTS "automacao_logs_insert" ON automacao_logs;

-- poker_sessoes
DROP POLICY IF EXISTS "poker_sessoes_all" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_select" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_insert" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_update" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_delete" ON poker_sessoes;

-- poker_votos
DROP POLICY IF EXISTS "poker_votos_all" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_select" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_insert" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_update" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_delete" ON poker_votos;

-- repositorios
DROP POLICY IF EXISTS "repositorios_all" ON repositorios;

-- perfis
DROP POLICY IF EXISTS "perfis_all" ON perfis;
DROP POLICY IF EXISTS "perfis_select" ON perfis;
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
DROP POLICY IF EXISTS "perfis_update" ON perfis;

-- api_keys
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;

-- github_tokens
DROP POLICY IF EXISTS "tokens_no_access" ON github_tokens;

-- rate_limits
DROP POLICY IF EXISTS "rate_limits_no_access" ON rate_limits;

-- =============================================
-- PASSO 4: Criar policies otimizadas
-- Padrao: my_workspace_ids() para check de workspace (1 subquery cacheada)
-- =============================================

-- ========================
-- PERFIS (publico leitura, usuario edita o proprio)
-- ========================
CREATE POLICY "perfis_select" ON perfis
  FOR SELECT USING (true);
CREATE POLICY "perfis_insert" ON perfis
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_update" ON perfis
  FOR UPDATE USING (id = auth.uid());

-- ========================
-- WORKSPACES
-- Nenhum JOIN — flat lookup via my_workspace_ids()
-- ========================
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (id IN (SELECT my_workspace_ids()));
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (id IN (SELECT my_workspace_ids()));
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE USING (is_workspace_admin(id));

-- ========================
-- WORKSPACE_USUARIOS
-- ========================
CREATE POLICY "ws_usuarios_select" ON workspace_usuarios
  FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT my_workspace_ids())
  );
CREATE POLICY "ws_usuarios_insert" ON workspace_usuarios
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id)
  );
CREATE POLICY "ws_usuarios_update" ON workspace_usuarios
  FOR UPDATE USING (is_workspace_admin(workspace_id));
CREATE POLICY "ws_usuarios_delete" ON workspace_usuarios
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id)
  );

-- ========================
-- QUADROS — flat: workspace_id direto
-- ========================
CREATE POLICY "quadros_select" ON quadros
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "quadros_insert" ON quadros
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "quadros_update" ON quadros
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "quadros_delete" ON quadros
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- COLUNAS — 1 nivel: quadro.workspace_id
-- Antes: 2 niveis (quadro → ws_usuarios)
-- Agora: JOIN simples, quadros ja filtrado por RLS
-- ========================
CREATE POLICY "colunas_select" ON colunas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT my_workspace_ids())
    )
  );
CREATE POLICY "colunas_insert" ON colunas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT my_workspace_ids())
    )
  );
CREATE POLICY "colunas_update" ON colunas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT my_workspace_ids())
    )
  );
CREATE POLICY "colunas_delete" ON colunas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- CARTOES — FLAT! workspace_id sempre preenchido
-- Antes: 4 niveis (coluna → quadro → ws_usuarios) + OR com workspace_id
-- Agora: 0 JOINs
-- ========================
CREATE POLICY "cartoes_select" ON cartoes
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "cartoes_insert" ON cartoes
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "cartoes_update" ON cartoes
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "cartoes_delete" ON cartoes
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- ETIQUETAS — flat: workspace_id direto
-- ========================
CREATE POLICY "etiquetas_all" ON etiquetas
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- MEMBROS — flat: workspace_id direto
-- ========================
CREATE POLICY "membros_all" ON membros
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- CARTAO_ETIQUETAS — 1 nivel: cartao.workspace_id
-- Antes: 3+ niveis (cartao → coluna → quadro → ws)
-- Agora: 1 EXISTS com index scan em cartoes(id) + cartoes(workspace_id)
-- ========================
CREATE POLICY "cartao_etiquetas_all" ON cartao_etiquetas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = cartao_etiquetas.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = cartao_etiquetas.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- CARTAO_MEMBROS — 1 nivel (igual cartao_etiquetas)
-- ========================
CREATE POLICY "cartao_membros_all" ON cartao_membros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = cartao_membros.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = cartao_membros.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- CHECKLISTS — 1 nivel: cartao.workspace_id
-- ========================
CREATE POLICY "checklists_all" ON checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = checklists.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = checklists.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- CHECKLIST_ITENS — 1 nivel: pula checklists, vai direto ao cartao
-- Antes: 3 niveis (checklist → cartao → coluna → quadro → ws)
-- Agora: 1 JOIN (checklist → cartao.workspace_id)
-- ========================
CREATE POLICY "checklist_itens_all" ON checklist_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cartoes c ON c.id = cl.cartao_id
      WHERE cl.id = checklist_itens.checklist_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cartoes c ON c.id = cl.cartao_id
      WHERE cl.id = checklist_itens.checklist_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- COMENTARIOS — 1 nivel: cartao.workspace_id
-- ========================
CREATE POLICY "comentarios_all" ON comentarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = comentarios.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = comentarios.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- ANEXOS — 1 nivel: cartao.workspace_id
-- ========================
CREATE POLICY "anexos_all" ON anexos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = anexos.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      WHERE c.id = anexos.cartao_id
      AND c.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- NOTIFICACOES — flat: usuario ve so as proprias
-- ========================
CREATE POLICY "notificacoes_select" ON notificacoes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notificacoes_insert" ON notificacoes
  FOR INSERT WITH CHECK (true);  -- service_role insere para qualquer user
CREATE POLICY "notificacoes_update" ON notificacoes
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notificacoes_delete" ON notificacoes
  FOR DELETE USING (user_id = auth.uid());

-- ========================
-- ATIVIDADES — flat: workspace_id direto
-- ========================
CREATE POLICY "atividades_select" ON atividades
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "atividades_insert" ON atividades
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================
-- AUTOMACOES — flat: workspace_id direto
-- ========================
CREATE POLICY "automacoes_select" ON automacoes
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "automacoes_insert" ON automacoes
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "automacoes_update" ON automacoes
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "automacoes_delete" ON automacoes
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- AUTOMACAO_LOGS — flat: workspace_id direto
-- ========================
CREATE POLICY "automacao_logs_select" ON automacao_logs
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "automacao_logs_insert" ON automacao_logs
  FOR INSERT WITH CHECK (true);  -- service_role insere via automacao executor

-- ========================
-- POKER_SESSOES — flat: workspace_id direto
-- ========================
CREATE POLICY "poker_sessoes_select" ON poker_sessoes
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "poker_sessoes_insert" ON poker_sessoes
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "poker_sessoes_update" ON poker_sessoes
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "poker_sessoes_delete" ON poker_sessoes
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- POKER_VOTOS — 1 nivel: sessao.workspace_id
-- Antes: 2 niveis (sessao → ws_usuarios)
-- ========================
CREATE POLICY "poker_votos_select" ON poker_votos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM poker_sessoes ps
      WHERE ps.id = poker_votos.sessao_id
      AND ps.workspace_id IN (SELECT my_workspace_ids())
    )
  );
CREATE POLICY "poker_votos_insert" ON poker_votos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "poker_votos_update" ON poker_votos
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "poker_votos_delete" ON poker_votos
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM poker_sessoes ps
      WHERE ps.id = poker_votos.sessao_id
      AND ps.workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- ========================
-- REPOSITORIOS — flat: workspace_id direto
-- ========================
CREATE POLICY "repositorios_all" ON repositorios
  FOR ALL USING (workspace_id IN (SELECT my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

-- ========================
-- API_KEYS — usuario ve so as proprias
-- ========================
CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- ========================
-- GITHUB_TOKENS — ninguem acessa via client (service_role only)
-- ========================
CREATE POLICY "tokens_no_access" ON github_tokens USING (false);

-- ========================
-- RATE_LIMITS — ninguem acessa via client (service_role only)
-- ========================
CREATE POLICY "rate_limits_no_access" ON rate_limits USING (false);

-- =============================================
-- PASSO 5: Indices adicionais para suportar as policies
-- =============================================

-- workspace_usuarios(user_id, workspace_id) — core de TODAS as policies
CREATE INDEX IF NOT EXISTS idx_ws_usuarios_user_ws
  ON workspace_usuarios(user_id, workspace_id);

-- quadros(workspace_id, id) — para policy de colunas
CREATE INDEX IF NOT EXISTS idx_quadros_ws_id
  ON quadros(workspace_id, id);

-- cartoes(id, workspace_id) — para policies de child tables (EXISTS subquery)
CREATE INDEX IF NOT EXISTS idx_cartoes_id_ws
  ON cartoes(id, workspace_id);

-- checklists(id, cartao_id) — para policy de checklist_itens
CREATE INDEX IF NOT EXISTS idx_checklists_id_cartao
  ON checklists(id, cartao_id);

-- poker_sessoes(id, workspace_id) — para policy de poker_votos
CREATE INDEX IF NOT EXISTS idx_poker_sessoes_id_ws
  ON poker_sessoes(id, workspace_id);

COMMIT;
