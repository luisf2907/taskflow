-- 031: Dependencias entre sprints (Finish-to-Start)
BEGIN;

CREATE TABLE IF NOT EXISTS sprint_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sprint_origem UUID NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
  sprint_destino UUID NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sprint_origem, sprint_destino),
  CHECK (sprint_origem != sprint_destino)
);

CREATE INDEX idx_sprint_deps_workspace ON sprint_dependencies(workspace_id);
CREATE INDEX idx_sprint_deps_origem ON sprint_dependencies(sprint_origem);
CREATE INDEX idx_sprint_deps_destino ON sprint_dependencies(sprint_destino);

ALTER TABLE sprint_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deps_select" ON sprint_dependencies FOR SELECT
  USING (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "deps_insert" ON sprint_dependencies FOR INSERT
  WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));
CREATE POLICY "deps_delete" ON sprint_dependencies FOR DELETE
  USING (workspace_id IN (SELECT my_workspace_ids()));

COMMIT;
