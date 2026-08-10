-- =============================================================================
-- 057_plano_pro.sql
-- -----------------------------------------------------------------------------
-- Plano por usuario. Sem cobranca — nesta fase o PRO e concedido a mao, e o
-- que ele destrava e a IA (rotas /api/ai/*).
--
-- Para promover alguem, rode no SQL Editor:
--
--   UPDATE public.perfis SET plano = 'pro' WHERE email = 'fulano@exemplo.com';
--
-- E para tirar:
--
--   UPDATE public.perfis SET plano = 'free' WHERE email = 'fulano@exemplo.com';
--
-- Conferir quem e PRO:
--
--   SELECT email, plano FROM public.perfis WHERE plano = 'pro' ORDER BY email;
-- =============================================================================

BEGIN;

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_plano_check;
ALTER TABLE public.perfis
  ADD CONSTRAINT perfis_plano_check CHECK (plano IN ('free', 'pro'));

-- -----------------------------------------------------------------------------
-- Trava contra auto-promocao
-- -----------------------------------------------------------------------------
-- `perfis_update` e `USING (id = auth.uid())` e nao declara WITH CHECK, entao
-- o Postgres reaproveita o USING como check: o usuario pode escrever qualquer
-- coluna da propria linha. Sem esta trava, virar PRO seria um UPDATE de uma
-- linha no console do navegador.
--
-- A checagem e por role do Postgres, e nao por auth.uid(): PostgREST roda as
-- requests do app como `authenticated`/`anon`, enquanto service_role, o SQL
-- Editor (postgres) e a CLI passam batido — que e exatamente quem deve poder
-- mudar plano.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bloqueia_plano_pelo_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'plano so pode ser alterado pelo backend'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfis_plano_protegido ON public.perfis;

CREATE TRIGGER trg_perfis_plano_protegido
  BEFORE UPDATE OF plano ON public.perfis
  FOR EACH ROW
  WHEN (OLD.plano IS DISTINCT FROM NEW.plano)
  EXECUTE FUNCTION public.bloqueia_plano_pelo_client();

COMMIT;
