-- =============================================
-- FIX: RLS Performance — auth.uid() avaliado por query, nao por row
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =============================================

-- PERFIS
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
CREATE POLICY "perfis_insert" ON perfis FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "perfis_update" ON perfis;
CREATE POLICY "perfis_update" ON perfis FOR UPDATE USING (id = (select auth.uid()));

-- WORKSPACES
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = id AND user_id = (select auth.uid()))
  OR NOT EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = id)
);

DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = id AND user_id = (select auth.uid()) AND papel = 'admin')
);

-- WORKSPACE_USUARIOS
DROP POLICY IF EXISTS "ws_usuarios_select" ON workspace_usuarios;
CREATE POLICY "ws_usuarios_select" ON workspace_usuarios FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "ws_usuarios_insert" ON workspace_usuarios;
CREATE POLICY "ws_usuarios_insert" ON workspace_usuarios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = workspace_usuarios.workspace_id AND user_id = (select auth.uid()) AND papel = 'admin')
  OR user_id = (select auth.uid())
);

-- NOTIFICACOES
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes;
CREATE POLICY "notificacoes_insert" ON notificacoes FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;
CREATE POLICY "notificacoes_update" ON notificacoes FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes;
CREATE POLICY "notificacoes_delete" ON notificacoes FOR DELETE USING (user_id = (select auth.uid()));

-- ATIVIDADES
DROP POLICY IF EXISTS "atividades_insert" ON atividades;
CREATE POLICY "atividades_insert" ON atividades FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- AUTOMACAO_LOGS
DROP POLICY IF EXISTS "Membros veem logs de automacao" ON automacao_logs;
CREATE POLICY "Membros veem logs de automacao" ON automacao_logs FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Inserir logs de automacao" ON automacao_logs;
CREATE POLICY "Inserir logs de automacao" ON automacao_logs FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- FIX: Policies permissivas (USING true) → restringir por workspace membership
-- =============================================

-- POKER_SESSOES
DROP POLICY IF EXISTS "Acesso total poker_sessoes" ON poker_sessoes;
CREATE POLICY "poker_sessoes_select" ON poker_sessoes FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "poker_sessoes_insert" ON poker_sessoes FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "poker_sessoes_update" ON poker_sessoes FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "poker_sessoes_delete" ON poker_sessoes FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- POKER_VOTOS
DROP POLICY IF EXISTS "Acesso total poker_votos" ON poker_votos;
CREATE POLICY "poker_votos_select" ON poker_votos FOR SELECT USING (
  sessao_id IN (SELECT id FROM poker_sessoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);
CREATE POLICY "poker_votos_insert" ON poker_votos FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "poker_votos_update" ON poker_votos FOR UPDATE USING (
  user_id = (select auth.uid())
);
CREATE POLICY "poker_votos_delete" ON poker_votos FOR DELETE USING (
  sessao_id IN (SELECT id FROM poker_sessoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- FIX: Functions sem search_path fixo
-- =============================================

ALTER FUNCTION public.check_rate_limit SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limits SET search_path = public;
ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.is_workspace_member SET search_path = public;
