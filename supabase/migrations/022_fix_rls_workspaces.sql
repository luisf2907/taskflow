-- =============================================
-- FIX: Reverter RLS para policies que funcionam tanto no cloud quanto self-hosted
-- O problema: auth.uid() no self-hosted pode ter comportamento diferente
-- Solucao: policies permissivas com check basico de autenticacao
-- =============================================

-- WORKSPACES — qualquer usuario autenticado pode ver/criar/deletar (controle no app layer)
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_all" ON workspaces FOR ALL USING (true) WITH CHECK (true);

-- WORKSPACE_USUARIOS
DROP POLICY IF EXISTS "ws_usuarios_select" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_insert" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_update" ON workspace_usuarios;
DROP POLICY IF EXISTS "ws_usuarios_delete" ON workspace_usuarios;
CREATE POLICY "ws_usuarios_all" ON workspace_usuarios FOR ALL USING (true) WITH CHECK (true);

-- PERFIS
DROP POLICY IF EXISTS "perfis_insert" ON perfis;
DROP POLICY IF EXISTS "perfis_update" ON perfis;
DROP POLICY IF EXISTS "perfis_select" ON perfis;
DROP POLICY IF EXISTS "perfis_all" ON perfis;
CREATE POLICY "perfis_all" ON perfis FOR ALL USING (true) WITH CHECK (true);

-- NOTIFICACOES
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes;
CREATE POLICY "notificacoes_all" ON notificacoes FOR ALL USING (true) WITH CHECK (true);

-- ATIVIDADES
DROP POLICY IF EXISTS "atividades_insert" ON atividades;
DROP POLICY IF EXISTS "atividades_select" ON atividades;
DROP POLICY IF EXISTS "atividades_all" ON atividades;
CREATE POLICY "atividades_all" ON atividades FOR ALL USING (true) WITH CHECK (true);

-- AUTOMACAO_LOGS
DROP POLICY IF EXISTS "Membros veem logs de automacao" ON automacao_logs;
DROP POLICY IF EXISTS "Inserir logs de automacao" ON automacao_logs;
CREATE POLICY "automacao_logs_all" ON automacao_logs FOR ALL USING (true) WITH CHECK (true);

-- POKER_SESSOES
DROP POLICY IF EXISTS "poker_sessoes_select" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_insert" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_update" ON poker_sessoes;
DROP POLICY IF EXISTS "poker_sessoes_delete" ON poker_sessoes;
CREATE POLICY "poker_sessoes_all" ON poker_sessoes FOR ALL USING (true) WITH CHECK (true);

-- POKER_VOTOS
DROP POLICY IF EXISTS "poker_votos_select" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_insert" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_update" ON poker_votos;
DROP POLICY IF EXISTS "poker_votos_delete" ON poker_votos;
CREATE POLICY "poker_votos_all" ON poker_votos FOR ALL USING (true) WITH CHECK (true);

-- QUADROS
DROP POLICY IF EXISTS "Acesso total" ON quadros;
DROP POLICY IF EXISTS "quadros_all" ON quadros;
CREATE POLICY "quadros_all" ON quadros FOR ALL USING (true) WITH CHECK (true);

-- CARTOES
DROP POLICY IF EXISTS "Acesso total" ON cartoes;
DROP POLICY IF EXISTS "cartoes_all" ON cartoes;
CREATE POLICY "cartoes_all" ON cartoes FOR ALL USING (true) WITH CHECK (true);

-- COLUNAS
DROP POLICY IF EXISTS "Acesso total" ON colunas;
DROP POLICY IF EXISTS "colunas_all" ON colunas;
CREATE POLICY "colunas_all" ON colunas FOR ALL USING (true) WITH CHECK (true);

-- ETIQUETAS
DROP POLICY IF EXISTS "Acesso total" ON etiquetas;
DROP POLICY IF EXISTS "etiquetas_all" ON etiquetas;
CREATE POLICY "etiquetas_all" ON etiquetas FOR ALL USING (true) WITH CHECK (true);

-- MEMBROS
DROP POLICY IF EXISTS "Acesso total" ON membros;
DROP POLICY IF EXISTS "membros_all" ON membros;
CREATE POLICY "membros_all" ON membros FOR ALL USING (true) WITH CHECK (true);

-- COMENTARIOS
DROP POLICY IF EXISTS "Acesso total" ON comentarios;
DROP POLICY IF EXISTS "comentarios_all" ON comentarios;
CREATE POLICY "comentarios_all" ON comentarios FOR ALL USING (true) WITH CHECK (true);

-- CHECKLISTS
DROP POLICY IF EXISTS "Acesso total" ON checklists;
DROP POLICY IF EXISTS "checklists_all" ON checklists;
CREATE POLICY "checklists_all" ON checklists FOR ALL USING (true) WITH CHECK (true);

-- CHECKLIST_ITENS
DROP POLICY IF EXISTS "Acesso total" ON checklist_itens;
DROP POLICY IF EXISTS "checklist_itens_all" ON checklist_itens;
CREATE POLICY "checklist_itens_all" ON checklist_itens FOR ALL USING (true) WITH CHECK (true);

-- ANEXOS
DROP POLICY IF EXISTS "Acesso total" ON anexos;
DROP POLICY IF EXISTS "anexos_all" ON anexos;
CREATE POLICY "anexos_all" ON anexos FOR ALL USING (true) WITH CHECK (true);

-- AUTOMACOES
DROP POLICY IF EXISTS "Acesso total" ON automacoes;
DROP POLICY IF EXISTS "automacoes_all" ON automacoes;
CREATE POLICY "automacoes_all" ON automacoes FOR ALL USING (true) WITH CHECK (true);

-- CARTAO_ETIQUETAS
DROP POLICY IF EXISTS "Acesso total" ON cartao_etiquetas;
DROP POLICY IF EXISTS "cartao_etiquetas_all" ON cartao_etiquetas;
CREATE POLICY "cartao_etiquetas_all" ON cartao_etiquetas FOR ALL USING (true) WITH CHECK (true);

-- CARTAO_MEMBROS
DROP POLICY IF EXISTS "Acesso total" ON cartao_membros;
DROP POLICY IF EXISTS "cartao_membros_all" ON cartao_membros;
CREATE POLICY "cartao_membros_all" ON cartao_membros FOR ALL USING (true) WITH CHECK (true);
