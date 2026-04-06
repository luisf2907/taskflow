-- 029: Links de convite para workspaces
BEGIN;

CREATE TABLE IF NOT EXISTS invite_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES perfis(id),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  ativo BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Membros do workspace podem ver e criar links
CREATE POLICY "invite_links_select" ON invite_links
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "invite_links_insert" ON invite_links
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "invite_links_update" ON invite_links
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "invite_links_delete" ON invite_links
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE INDEX idx_invite_links_code ON invite_links(code);
CREATE INDEX idx_invite_links_workspace ON invite_links(workspace_id);

COMMIT;
