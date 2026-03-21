-- =============================================
-- 009: Autenticação, Equipes e PR Integration
-- =============================================

-- 1. PERFIS (espelho de auth.users)
CREATE TABLE IF NOT EXISTS perfis (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  github_username TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Trigger: criar perfil ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, avatar_url, github_username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. WORKSPACE MEMBERSHIP
CREATE TABLE IF NOT EXISTS workspace_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  papel TEXT NOT NULL DEFAULT 'membro' CHECK (papel IN ('admin', 'membro')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ws_usuarios_workspace ON workspace_usuarios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_usuarios_user ON workspace_usuarios(user_id);

ALTER TABLE workspace_usuarios ENABLE ROW LEVEL SECURITY;

-- 3. GITHUB TOKENS (só acessível via service role)
CREATE TABLE IF NOT EXISTS github_tokens (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  provider_token TEXT NOT NULL,
  provider_refresh_token TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

-- 4. NOVAS COLUNAS

-- workspaces: quem criou
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- membros: link opcional com auth user
ALTER TABLE membros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_membros_user ON membros(user_id) WHERE user_id IS NOT NULL;

-- cartoes: campos de PR
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_numero INTEGER;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_url TEXT;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_status TEXT CHECK (pr_status IS NULL OR pr_status IN ('open', 'closed', 'merged'));
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_repo_id UUID REFERENCES repositorios(id) ON DELETE SET NULL;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_autor TEXT;

CREATE INDEX IF NOT EXISTS idx_cartoes_pr ON cartoes(pr_repo_id, pr_numero) WHERE pr_numero IS NOT NULL;

-- Constraint unique para upsert de PR cards
ALTER TABLE cartoes ADD CONSTRAINT cartoes_pr_unique UNIQUE (pr_repo_id, pr_numero);

-- repositorios: config de webhook e mapeamento de colunas
ALTER TABLE repositorios ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
ALTER TABLE repositorios ADD COLUMN IF NOT EXISTS coluna_review_id UUID REFERENCES colunas(id) ON DELETE SET NULL;
ALTER TABLE repositorios ADD COLUMN IF NOT EXISTS coluna_done_id UUID REFERENCES colunas(id) ON DELETE SET NULL;
ALTER TABLE repositorios ADD COLUMN IF NOT EXISTS coluna_doing_id UUID REFERENCES colunas(id) ON DELETE SET NULL;

-- 5. HELPER: checar membership no workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. SUBSTITUIR POLICIES PERMISSIVAS POR POLICIES REAIS

-- perfis
CREATE POLICY "perfis_select" ON perfis FOR SELECT USING (true);
CREATE POLICY "perfis_update" ON perfis FOR UPDATE USING (id = auth.uid());
CREATE POLICY "perfis_insert" ON perfis FOR INSERT WITH CHECK (id = auth.uid());

-- github_tokens: só service role (nenhum acesso via anon/authenticated)
CREATE POLICY "tokens_no_access" ON github_tokens FOR ALL USING (false);

-- workspace_usuarios
CREATE POLICY "ws_usuarios_select" ON workspace_usuarios FOR SELECT
  USING (is_workspace_member(workspace_id) OR user_id = auth.uid());
CREATE POLICY "ws_usuarios_insert" ON workspace_usuarios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ws_usuarios_delete" ON workspace_usuarios FOR DELETE
  USING (is_workspace_member(workspace_id));

-- workspaces: drop old, create new
DROP POLICY IF EXISTS "Acesso total workspaces" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (is_workspace_member(id) OR criado_por = auth.uid() OR criado_por IS NULL);
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (is_workspace_member(id) OR criado_por IS NULL);
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE
  USING (criado_por = auth.uid());

-- quadros
DROP POLICY IF EXISTS "Acesso total quadros" ON quadros;
CREATE POLICY "quadros_select" ON quadros FOR SELECT
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));
CREATE POLICY "quadros_insert" ON quadros FOR INSERT
  WITH CHECK (workspace_id IS NULL OR is_workspace_member(workspace_id));
CREATE POLICY "quadros_update" ON quadros FOR UPDATE
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));
CREATE POLICY "quadros_delete" ON quadros FOR DELETE
  USING (workspace_id IS NULL OR is_workspace_member(workspace_id));

-- colunas (via quadro -> workspace)
DROP POLICY IF EXISTS "Acesso total colunas" ON colunas;
CREATE POLICY "colunas_all" ON colunas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quadros q
      WHERE q.id = colunas.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    )
  );

-- cartoes (via coluna -> quadro -> workspace, ou backlog via workspace_id)
DROP POLICY IF EXISTS "Acesso total cartoes" ON cartoes;
CREATE POLICY "cartoes_all" ON cartoes FOR ALL
  USING (
    -- Card no backlog (workspace_id direto)
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
    OR
    -- Card em coluna
    (coluna_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM colunas c
      JOIN quadros q ON q.id = c.quadro_id
      WHERE c.id = cartoes.coluna_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR
    -- Card orfão (sem coluna nem workspace)
    (coluna_id IS NULL AND workspace_id IS NULL)
  )
  WITH CHECK (
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
    OR
    (coluna_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM colunas c
      JOIN quadros q ON q.id = c.quadro_id
      WHERE c.id = cartoes.coluna_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR
    (coluna_id IS NULL AND workspace_id IS NULL)
  );

-- etiquetas
DROP POLICY IF EXISTS "Acesso total etiquetas" ON etiquetas;
CREATE POLICY "etiquetas_all" ON etiquetas FOR ALL
  USING (
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
    OR (quadro_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quadros q WHERE q.id = etiquetas.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR (workspace_id IS NULL AND quadro_id IS NULL)
  )
  WITH CHECK (
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
    OR (quadro_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quadros q WHERE q.id = etiquetas.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR (workspace_id IS NULL AND quadro_id IS NULL)
  );

-- cartao_etiquetas
DROP POLICY IF EXISTS "Acesso total cartao_etiquetas" ON cartao_etiquetas;
CREATE POLICY "cartao_etiquetas_all" ON cartao_etiquetas FOR ALL
  USING (true) WITH CHECK (true);

-- membros
DROP POLICY IF EXISTS "Acesso total membros" ON membros;
CREATE POLICY "membros_all" ON membros FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quadros q WHERE q.id = membros.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    )
    OR NOT EXISTS (SELECT 1 FROM quadros q WHERE q.id = membros.quadro_id)
  )
  WITH CHECK (true);

-- cartao_membros
DROP POLICY IF EXISTS "Acesso total cartao_membros" ON cartao_membros;
CREATE POLICY "cartao_membros_all" ON cartao_membros FOR ALL
  USING (true) WITH CHECK (true);

-- checklists
DROP POLICY IF EXISTS "Acesso total checklists" ON checklists;
CREATE POLICY "checklists_all" ON checklists FOR ALL
  USING (true) WITH CHECK (true);

-- checklist_itens
DROP POLICY IF EXISTS "Acesso total checklist_itens" ON checklist_itens;
CREATE POLICY "checklist_itens_all" ON checklist_itens FOR ALL
  USING (true) WITH CHECK (true);

-- comentarios
DROP POLICY IF EXISTS "Acesso total comentarios" ON comentarios;
CREATE POLICY "comentarios_all" ON comentarios FOR ALL
  USING (true) WITH CHECK (true);

-- anexos
DROP POLICY IF EXISTS "Acesso total anexos" ON anexos;
CREATE POLICY "anexos_all" ON anexos FOR ALL
  USING (true) WITH CHECK (true);

-- repositorios
DROP POLICY IF EXISTS "Acesso total repositorios" ON repositorios;
CREATE POLICY "repositorios_all" ON repositorios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = repositorios.workspace_id
      AND (is_workspace_member(w.id) OR w.criado_por IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = repositorios.workspace_id
      AND (is_workspace_member(w.id) OR w.criado_por IS NULL)
    )
  );
