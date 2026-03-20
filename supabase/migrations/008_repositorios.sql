-- Migration 008: Repositórios GitHub vinculados ao workspace

CREATE TABLE repositorios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  owner TEXT NOT NULL,
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, owner, nome)
);

CREATE INDEX idx_repositorios_workspace ON repositorios(workspace_id);

ALTER TABLE repositorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total repositorios" ON repositorios FOR ALL USING (true) WITH CHECK (true);
