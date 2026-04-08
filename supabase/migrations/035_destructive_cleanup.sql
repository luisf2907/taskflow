-- =============================================================================
-- 035_destructive_cleanup.sql
-- Limpeza destrutiva aprovada apos diagnostico manual (counts rodados em prod):
--   * cartoes.etiquetas text[]           -> 0 linhas usando  -> DROP
--   * membros sem owner / so-quadro      -> 0 linhas         -> DROP quadro_id
--   * quadros.workspace_id IS NULL       -> 0 linhas         -> SET NOT NULL
--   * atividades.workspace_id IS NULL    -> 39 linhas:
--       * 6 recuperaveis via quadro_id/cartao_id -> BACKFILL
--       * 34 irrecuperaveis (pre-migration)      -> DELETE
--     -> SET NOT NULL
--
-- Tudo transacional. Se algo falhar, nada aplica.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Backfill de atividades.workspace_id via quadros (quando quadro_id existe)
-- -----------------------------------------------------------------------------

UPDATE public.atividades a
SET workspace_id = q.workspace_id
FROM public.quadros q
WHERE a.workspace_id IS NULL
  AND a.quadro_id    IS NOT NULL
  AND q.id           = a.quadro_id
  AND q.workspace_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Backfill de atividades.workspace_id via cartoes (para as restantes)
-- -----------------------------------------------------------------------------

UPDATE public.atividades a
SET workspace_id = c.workspace_id
FROM public.cartoes c
WHERE a.workspace_id IS NULL
  AND a.cartao_id    IS NOT NULL
  AND c.id           = a.cartao_id;

-- -----------------------------------------------------------------------------
-- 3. Deletar as atividades que continuam sem workspace (aprovado pelo usuario)
-- -----------------------------------------------------------------------------

DELETE FROM public.atividades WHERE workspace_id IS NULL;

-- -----------------------------------------------------------------------------
-- 4. NOT NULL em atividades.workspace_id
-- -----------------------------------------------------------------------------

ALTER TABLE public.atividades
  ALTER COLUMN workspace_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. NOT NULL em quadros.workspace_id
-- -----------------------------------------------------------------------------

ALTER TABLE public.quadros
  ALTER COLUMN workspace_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Dropar cartoes.etiquetas text[] (0 linhas usando, coberto pela M2M)
-- -----------------------------------------------------------------------------

ALTER TABLE public.cartoes
  DROP COLUMN IF EXISTS etiquetas;

-- -----------------------------------------------------------------------------
-- 7. Unificar membros em workspace-only
-- -----------------------------------------------------------------------------

ALTER TABLE public.membros
  DROP CONSTRAINT IF EXISTS membros_has_owner;

DROP INDEX IF EXISTS public.idx_membros_quadro;

ALTER TABLE public.membros
  DROP COLUMN IF EXISTS quadro_id;

ALTER TABLE public.membros
  ALTER COLUMN workspace_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 8. Sanity checks — falham a transacao se algo der errado
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v int;
BEGIN
  SELECT count(*) INTO v FROM public.atividades WHERE workspace_id IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'atividades ainda tem % linhas sem workspace_id', v; END IF;

  SELECT count(*) INTO v FROM public.quadros WHERE workspace_id IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'quadros ainda tem % linhas sem workspace_id', v; END IF;

  SELECT count(*) INTO v FROM public.membros WHERE workspace_id IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'membros ainda tem % linhas sem workspace_id', v; END IF;
END $$;

COMMIT;

-- =============================================================================
-- Fim de 035_destructive_cleanup.sql
-- =============================================================================
