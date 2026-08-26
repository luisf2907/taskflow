-- =============================================================================
-- 058_feedbacks.sql
-- -----------------------------------------------------------------------------
-- Feedback dos usuarios: sugestao, problema ou outro.
--
-- Nao ha tela de listagem de proposito — feedback e volume baixo e leitura
-- esporadica, entao uma tela admin seria codigo pra manter sem uso. A leitura
-- e feita pelo SQL Editor / Studio, onde service_role passa por cima da RLS.
--
-- Ver os mais recentes:
--
--   SELECT f.criado_em, f.tipo, p.email, f.pagina, f.mensagem
--     FROM public.feedbacks f
--     LEFT JOIN public.perfis p ON p.id = f.usuario_id
--    ORDER BY f.criado_em DESC
--    LIMIT 50;
--
-- Contar por tipo no ultimo mes:
--
--   SELECT tipo, count(*)
--     FROM public.feedbacks
--    WHERE criado_em > now() - interval '30 days'
--    GROUP BY tipo ORDER BY 2 DESC;
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Workspace ativo no momento do envio. Nullable porque o usuario pode
  -- mandar feedback de fora de um workspace (settings, dashboard vazio), e
  -- ON DELETE SET NULL porque apagar o workspace nao deve apagar o relato.
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  tipo         TEXT NOT NULL DEFAULT 'sugestao',
  mensagem     TEXT NOT NULL,
  -- Rota de onde o feedback partiu. Contexto que o usuario nunca escreve
  -- ("na tela de quadro...") e que decide se o relato e acionavel.
  pagina       TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks DROP CONSTRAINT IF EXISTS feedbacks_tipo_check;
ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_tipo_check CHECK (tipo IN ('sugestao', 'problema', 'outro'));

-- Limite no banco, nao so na API: a RLS permite INSERT direto pelo PostgREST,
-- entao validar apenas na rota deixaria a porta aberta pelo console.
ALTER TABLE public.feedbacks DROP CONSTRAINT IF EXISTS feedbacks_mensagem_check;
ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_mensagem_check
  CHECK (char_length(mensagem) BETWEEN 3 AND 2000);

CREATE INDEX IF NOT EXISTS feedbacks_criado_em_idx
  ON public.feedbacks (criado_em DESC);
CREATE INDEX IF NOT EXISTS feedbacks_usuario_id_idx
  ON public.feedbacks (usuario_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- Cada um enxerga e escreve so o proprio feedback.
--
-- Nao ha policy de UPDATE nem de DELETE, e isso e intencional: sem policy,
-- a RLS nega. Feedback enviado e registro historico — editar depois faria o
-- relato divergir do que o autor de fato relatou na hora. service_role e o
-- SQL Editor continuam podendo limpar spam.
-- -----------------------------------------------------------------------------

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedbacks_select" ON public.feedbacks;
CREATE POLICY "feedbacks_select" ON public.feedbacks
  FOR SELECT USING (
    usuario_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "feedbacks_insert" ON public.feedbacks;
CREATE POLICY "feedbacks_insert" ON public.feedbacks
  FOR INSERT WITH CHECK (
    usuario_id = (SELECT auth.uid())
  );

COMMIT;
