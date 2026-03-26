-- ============================================
-- 016: Security Hardening — RLS policies
-- ============================================

-- ============================================
-- 1. FIX: atividades — restrict to workspace members
-- ============================================
DROP POLICY IF EXISTS "Acesso total atividades" ON atividades;

CREATE POLICY "atividades_select" ON atividades FOR SELECT
  USING (
    workspace_id IS NOT NULL AND is_workspace_member(workspace_id)
  );

CREATE POLICY "atividades_insert" ON atividades FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_member(workspace_id))
  );

CREATE POLICY "atividades_delete" ON atividades FOR DELETE
  USING (false); -- activity log is immutable

-- ============================================
-- 2. FIX: notificacoes — restrict to own user
-- ============================================
DROP POLICY IF EXISTS "Acesso total notificacoes" ON notificacoes;

CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notificacoes_insert" ON notificacoes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notificacoes_update" ON notificacoes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notificacoes_delete" ON notificacoes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. FIX: cartao_etiquetas — restrict via card's workspace
-- ============================================
DROP POLICY IF EXISTS "cartao_etiquetas_all" ON cartao_etiquetas;

CREATE POLICY "cartao_etiquetas_all" ON cartao_etiquetas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = cartao_etiquetas.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = cartao_etiquetas.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 4. FIX: cartao_membros — restrict via card's workspace
-- ============================================
DROP POLICY IF EXISTS "cartao_membros_all" ON cartao_membros;

CREATE POLICY "cartao_membros_all" ON cartao_membros FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = cartao_membros.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = cartao_membros.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 5. FIX: checklists — restrict via card's workspace
-- ============================================
DROP POLICY IF EXISTS "checklists_all" ON checklists;

CREATE POLICY "checklists_all" ON checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = checklists.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = checklists.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 6. FIX: checklist_itens — restrict via checklist's card's workspace
-- ============================================
DROP POLICY IF EXISTS "checklist_itens_all" ON checklist_itens;

CREATE POLICY "checklist_itens_all" ON checklist_itens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cartoes c ON c.id = cl.cartao_id
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE cl.id = checklist_itens.checklist_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists cl
      JOIN cartoes c ON c.id = cl.cartao_id
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE cl.id = checklist_itens.checklist_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 7. FIX: comentarios — restrict via card's workspace
-- ============================================
DROP POLICY IF EXISTS "comentarios_all" ON comentarios;

CREATE POLICY "comentarios_all" ON comentarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = comentarios.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = comentarios.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 8. FIX: anexos — restrict via card's workspace
-- ============================================
DROP POLICY IF EXISTS "anexos_all" ON anexos;

CREATE POLICY "anexos_all" ON anexos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = anexos.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cartoes c
      LEFT JOIN colunas col ON col.id = c.coluna_id
      LEFT JOIN quadros q ON q.id = col.quadro_id
      WHERE c.id = anexos.cartao_id
      AND (
        (c.workspace_id IS NOT NULL AND is_workspace_member(c.workspace_id))
        OR (q.workspace_id IS NOT NULL AND is_workspace_member(q.workspace_id))
      )
    )
  );

-- ============================================
-- 9. FIX: membros — tighten WITH CHECK
-- ============================================
DROP POLICY IF EXISTS "membros_all" ON membros;

CREATE POLICY "membros_all" ON membros FOR ALL
  USING (
    -- Board-scoped member: check via quadro → workspace
    (quadro_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quadros q WHERE q.id = membros.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR
    -- Workspace-scoped member: check workspace membership
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  )
  WITH CHECK (
    (quadro_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quadros q WHERE q.id = membros.quadro_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    OR
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );

-- ============================================
-- 10. FIX: cartoes — remove orphaned card loophole
-- ============================================
DROP POLICY IF EXISTS "cartoes_all" ON cartoes;

CREATE POLICY "cartoes_all" ON cartoes FOR ALL
  USING (
    -- Card no backlog (workspace_id direto)
    (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
    OR
    -- Card em coluna (via quadro → workspace)
    (coluna_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM colunas c
      JOIN quadros q ON q.id = c.quadro_id
      WHERE c.id = cartoes.coluna_id
      AND (q.workspace_id IS NULL OR is_workspace_member(q.workspace_id))
    ))
    -- REMOVED: orphaned card clause (coluna_id IS NULL AND workspace_id IS NULL)
    -- Orphaned cards are no longer accessible. They must belong to a workspace or column.
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
  );

-- ============================================
-- 11. Indexes for new RLS JOINs performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cartao_etiquetas_cartao ON cartao_etiquetas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_membros_cartao ON cartao_membros(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_membros_membro ON cartao_membros(membro_id);
CREATE INDEX IF NOT EXISTS idx_cartao_etiquetas_etiqueta ON cartao_etiquetas(etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_checklists_cartao ON checklists(cartao_id);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_checklist ON checklist_itens(checklist_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_cartao ON comentarios(cartao_id);
CREATE INDEX IF NOT EXISTS idx_anexos_cartao ON anexos(cartao_id);
CREATE INDEX IF NOT EXISTS idx_membros_workspace ON membros(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_membros_user_id ON membros(user_id) WHERE user_id IS NOT NULL;
