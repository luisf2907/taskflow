-- =============================================
-- RLS COMPLETA: Remover policies permissivas e substituir por workspace membership
-- Todas as tabelas devem ter policies reais
-- =============================================

-- Helper: garante que is_workspace_member existe
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id AND user_id = (select auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- =============================================
-- PERFIS (usuario so ve/edita o proprio)
-- =============================================
DROP POLICY IF EXISTS "perfis_all" ON perfis;
DROP POLICY IF EXISTS "perfis_select" ON perfis;
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
DROP POLICY IF EXISTS "perfis_update" ON perfis;

CREATE POLICY "perfis_select" ON perfis FOR SELECT USING (true);
CREATE POLICY "perfis_insert" ON perfis FOR INSERT WITH CHECK (id = (select auth.uid()));
CREATE POLICY "perfis_update" ON perfis FOR UPDATE USING (id = (select auth.uid()));

-- =============================================
-- WORKSPACES (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "workspaces_all" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (
  id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (
  EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = id AND user_id = (select auth.uid()) AND papel = 'admin')
);

-- =============================================
-- WORKSPACE_USUARIOS
-- =============================================
DROP POLICY IF EXISTS "ws_usuarios_all" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_select" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_insert" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_update" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_delete" ON workspace_usuarios;

CREATE POLICY "ws_usuarios_select" ON workspace_usuarios FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "ws_usuarios_insert" ON workspace_usuarios FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_usuarios WHERE workspace_id = workspace_usuarios.workspace_id AND user_id = (select auth.uid()) AND papel = 'admin')
);
CREATE POLICY "ws_usuarios_update" ON workspace_usuarios FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workspace_usuarios wu2 WHERE wu2.workspace_id = workspace_usuarios.workspace_id AND wu2.user_id = (select auth.uid()) AND wu2.papel = 'admin')
);
CREATE POLICY "ws_usuarios_delete" ON workspace_usuarios FOR DELETE USING (
  user_id = (select auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_usuarios wu2 WHERE wu2.workspace_id = workspace_usuarios.workspace_id AND wu2.user_id = (select auth.uid()) AND wu2.papel = 'admin')
);

-- =============================================
-- QUADROS (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "quadros_all" ON quadros;
DROP POLICY IF EXISTS "quadros_select" ON quadros;
DROP POLICY IF EXISTS "quadros_insert" ON quadros;
DROP POLICY IF EXISTS "quadros_update" ON quadros;
DROP POLICY IF EXISTS "quadros_delete" ON quadros;

CREATE POLICY "quadros_select" ON quadros FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "quadros_insert" ON quadros FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "quadros_update" ON quadros FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "quadros_delete" ON quadros FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- COLUNAS (membro do workspace via quadro)
-- =============================================
DROP POLICY IF EXISTS "colunas_all" ON colunas;
DROP POLICY IF EXISTS "colunas_select" ON colunas;
DROP POLICY IF EXISTS "colunas_insert" ON colunas;
DROP POLICY IF EXISTS "colunas_update" ON colunas;
DROP POLICY IF EXISTS "colunas_delete" ON colunas;

CREATE POLICY "colunas_select" ON colunas FOR SELECT USING (
  quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);
CREATE POLICY "colunas_insert" ON colunas FOR INSERT WITH CHECK (
  quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);
CREATE POLICY "colunas_update" ON colunas FOR UPDATE USING (
  quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);
CREATE POLICY "colunas_delete" ON colunas FOR DELETE USING (
  quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- CARTOES (membro do workspace via coluna/quadro OU workspace_id direto para backlog)
-- =============================================
DROP POLICY IF EXISTS "cartoes_all" ON cartoes;
DROP POLICY IF EXISTS "cartoes_select" ON cartoes;
DROP POLICY IF EXISTS "cartoes_insert" ON cartoes;
DROP POLICY IF EXISTS "cartoes_update" ON cartoes;
DROP POLICY IF EXISTS "cartoes_delete" ON cartoes;

CREATE POLICY "cartoes_select" ON cartoes FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
  OR coluna_id IN (SELECT id FROM colunas WHERE quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
);
CREATE POLICY "cartoes_insert" ON cartoes FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
  OR coluna_id IN (SELECT id FROM colunas WHERE quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
);
CREATE POLICY "cartoes_update" ON cartoes FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
  OR coluna_id IN (SELECT id FROM colunas WHERE quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
);
CREATE POLICY "cartoes_delete" ON cartoes FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
  OR coluna_id IN (SELECT id FROM colunas WHERE quadro_id IN (SELECT id FROM quadros WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
);

-- =============================================
-- ETIQUETAS (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "etiquetas_all" ON etiquetas;
CREATE POLICY "etiquetas_all" ON etiquetas FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
) WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- CARTAO_ETIQUETAS (autenticado — controle via cartao)
-- =============================================
DROP POLICY IF EXISTS "cartao_etiquetas_all" ON cartao_etiquetas;
CREATE POLICY "cartao_etiquetas_all" ON cartao_etiquetas FOR ALL USING (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
) WITH CHECK (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- MEMBROS (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "membros_all" ON membros;
CREATE POLICY "membros_all" ON membros FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
) WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- CARTAO_MEMBROS (autenticado — controle via cartao)
-- =============================================
DROP POLICY IF EXISTS "cartao_membros_all" ON cartao_membros;
CREATE POLICY "cartao_membros_all" ON cartao_membros FOR ALL USING (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
) WITH CHECK (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- CHECKLISTS (via cartao → workspace)
-- =============================================
DROP POLICY IF EXISTS "checklists_all" ON checklists;
CREATE POLICY "checklists_all" ON checklists FOR ALL USING (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
) WITH CHECK (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- CHECKLIST_ITENS (via checklist → cartao → workspace)
-- =============================================
DROP POLICY IF EXISTS "checklist_itens_all" ON checklist_itens;
CREATE POLICY "checklist_itens_all" ON checklist_itens FOR ALL USING (
  checklist_id IN (SELECT id FROM checklists WHERE cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
) WITH CHECK (
  checklist_id IN (SELECT id FROM checklists WHERE cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))))
);

-- =============================================
-- COMENTARIOS (via cartao → workspace)
-- =============================================
DROP POLICY IF EXISTS "comentarios_all" ON comentarios;
CREATE POLICY "comentarios_all" ON comentarios FOR ALL USING (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
) WITH CHECK (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- ANEXOS (via cartao → workspace)
-- =============================================
DROP POLICY IF EXISTS "anexos_all" ON anexos;
CREATE POLICY "anexos_all" ON anexos FOR ALL USING (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
) WITH CHECK (
  cartao_id IN (SELECT id FROM cartoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- NOTIFICACOES (usuario so ve as proprias)
-- =============================================
DROP POLICY IF EXISTS "notificacoes_all" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes;

CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "notificacoes_insert" ON notificacoes FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "notificacoes_update" ON notificacoes FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY "notificacoes_delete" ON notificacoes FOR DELETE USING (user_id = (select auth.uid()));

-- =============================================
-- ATIVIDADES (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "atividades_all" ON atividades;
DROP POLICY IF EXISTS "atividades_select" ON atividades;
DROP POLICY IF EXISTS "atividades_insert" ON atividades;

CREATE POLICY "atividades_select" ON atividades FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "atividades_insert" ON atividades FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- =============================================
-- AUTOMACOES (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "automacoes_all" ON automacoes;
CREATE POLICY "automacoes_all" ON automacoes FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
) WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- AUTOMACAO_LOGS (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "automacao_logs_all" ON automacao_logs;
DROP POLICY IF EXISTS "Membros veem logs de automacao" ON automacao_logs;
DROP POLICY IF EXISTS "Inserir logs de automacao" ON automacao_logs;

CREATE POLICY "automacao_logs_select" ON automacao_logs FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);
CREATE POLICY "automacao_logs_insert" ON automacao_logs FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid()))
);

-- =============================================
-- POKER_SESSOES (membro do workspace)
-- =============================================
DROP POLICY IF EXISTS "poker_sessoes_all" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_select" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_insert" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_update" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_delete" ON poker_sessoes;

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

-- =============================================
-- POKER_VOTOS (membro do workspace via sessao)
-- =============================================
DROP POLICY IF EXISTS "poker_votos_all" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_select" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_insert" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_update" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_delete" ON poker_votos;

CREATE POLICY "poker_votos_select" ON poker_votos FOR SELECT USING (
  sessao_id IN (SELECT id FROM poker_sessoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);
CREATE POLICY "poker_votos_insert" ON poker_votos FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "poker_votos_update" ON poker_votos FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY "poker_votos_delete" ON poker_votos FOR DELETE USING (
  sessao_id IN (SELECT id FROM poker_sessoes WHERE workspace_id IN (SELECT workspace_id FROM workspace_usuarios WHERE user_id = (select auth.uid())))
);

-- =============================================
-- Functions search_path fix
-- =============================================
ALTER FUNCTION public.check_rate_limit SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limits SET search_path = public;
ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.is_workspace_member SET search_path = public;
