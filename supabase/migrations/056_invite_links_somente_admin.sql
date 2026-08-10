-- =============================================================================
-- 056_invite_links_somente_admin.sql
-- -----------------------------------------------------------------------------
-- Gestao de equipe passa a ser exclusiva de admins.
--
-- A 029 criou invite_links com INSERT/UPDATE/DELETE liberados para qualquer
-- membro (`workspace_id IN (SELECT my_workspace_ids())`). Como convidar gente
-- agora e acao de admin (ver /api/workspace-invite), um membro comum ainda
-- conseguiria gerar um link de convite direto pelo client e contornar a regra.
--
-- SELECT continua liberado para membros: ler um link que o admin ja criou nao
-- concede nada alem do que o proprio admin decidiu compartilhar.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "invite_links_insert" ON invite_links;
CREATE POLICY "invite_links_insert" ON invite_links
  FOR INSERT WITH CHECK (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "invite_links_update" ON invite_links;
CREATE POLICY "invite_links_update" ON invite_links
  FOR UPDATE USING (is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "invite_links_delete" ON invite_links;
CREATE POLICY "invite_links_delete" ON invite_links
  FOR DELETE USING (is_workspace_admin(workspace_id));

COMMIT;
