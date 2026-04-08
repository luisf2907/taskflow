-- =============================================================================
-- 032_fix_workspace_creator_trigger.sql
-- -----------------------------------------------------------------------------
-- Corrige 403 ao criar workspace via client Supabase.
--
-- Causa raiz: o hook use-workspaces.ts faz `.insert(...).select().single()`.
-- A policy de SELECT em workspaces usa `id IN (SELECT my_workspace_ids())`,
-- que lê de workspace_usuarios. No momento do SELECT embutido (mesma request),
-- o criador ainda nao esta em workspace_usuarios — o `.select()` retorna
-- nada e o PostgREST responde 403 por `.single()`.
--
-- Fix em 2 partes:
--   1) Trigger AFTER INSERT em workspaces que adiciona o criador como admin
--      em workspace_usuarios automaticamente, na mesma transacao, antes do
--      RETURNING/SELECT ser avaliado pelo PostgREST.
--   2) Policy de SELECT passa a aceitar tambem `criado_por = auth.uid()`,
--      cobrindo qualquer race condition residual com cache de STABLE function.
-- =============================================================================

-- Parte 1: trigger que adiciona o criador como admin ----------------------------

CREATE OR REPLACE FUNCTION public.auto_add_workspace_creator()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_usuarios (workspace_id, user_id, papel)
  VALUES (NEW.id, COALESCE(NEW.criado_por, auth.uid()), 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_workspace_creator ON public.workspaces;

CREATE TRIGGER trg_auto_add_workspace_creator
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_workspace_creator();

-- Parte 2: SELECT policy inclui criado_por ------------------------------------

DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;

CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (
    criado_por = (select auth.uid())
    OR id IN (SELECT my_workspace_ids())
  );
