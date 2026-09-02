-- =============================================================================
-- 059_versionamento_e_conquistas.sql
-- -----------------------------------------------------------------------------
-- Duas coisas que compartilham o mesmo mecanismo: avisos que aparecem no
-- primeiro login depois de um evento.
--
--   1. "Novidades da versao X"  -> perfis.ultima_versao_vista
--   2. "Sua sugestao virou melhoria" -> tabela conquistas
--
-- O CONTEUDO de ambos (texto do changelog, nome/icone/frase de cada insignia)
-- mora no codigo, em src/lib/changelog.ts e src/lib/conquistas.ts. Aqui fica
-- so o ESTADO: o que cada pessoa ja viu. Mesma divisao que a 058 faz com
-- feedbacks, e pelo mesmo motivo — conteudo versiona junto com o release,
-- estado nao.
--
-- Ver quem ganhou o que:
--
--   SELECT c.criado_em, p.email, c.tipo, c.versao, f.mensagem
--     FROM public.conquistas c
--     JOIN public.perfis p ON p.id = c.usuario_id
--     LEFT JOIN public.feedbacks f ON f.id = c.feedback_id
--    ORDER BY c.criado_em DESC;
--
-- Feedbacks ainda sem triagem:
--
--   SELECT id, criado_em, tipo, pagina, mensagem
--     FROM public.feedbacks WHERE status = 'novo'
--    ORDER BY criado_em DESC;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Versao vista por usuario
-- -----------------------------------------------------------------------------
-- NULL tem significado: "nunca carimbado". O app trata NULL como
-- "carimbe a versao atual em silencio e NAO mostre nada". Isso resolve os
-- dois casos de borda de uma vez so, sem precisar mexer no trigger
-- handle_new_user (que nao teria como saber a versao do app):
--
--   - quem se cadastrou agora nao leva na cara um "o que mudou na v1.2",
--     porque nunca viu a v1.1;
--   - quem ja era usuario antes desta migration nao recebe o changelog
--     inteiro retroativo no primeiro login.
--
-- Em ambos, o proximo release e que mostra o modal — que e o comportamento
-- desejado.
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS ultima_versao_vista TEXT;

-- -----------------------------------------------------------------------------
-- 2. Triagem de feedback
-- -----------------------------------------------------------------------------
-- A 058 criou feedbacks sem status: era so caixa de entrada. Agora um
-- feedback tem ciclo de vida, porque "implementado" e o que dispara a
-- insignia.
--
-- `versao` e a release em que a sugestao entrou — serve pra ligar a conquista
-- ao changelog ("sua ideia esta na v1.2").
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'novo';
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS versao TEXT;

ALTER TABLE public.feedbacks DROP CONSTRAINT IF EXISTS feedbacks_status_check;
ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_status_check
  CHECK (status IN ('novo', 'analisado', 'implementado', 'descartado'));

CREATE INDEX IF NOT EXISTS feedbacks_status_idx
  ON public.feedbacks (status, criado_em DESC);

-- A 058 nao criou policy de UPDATE de proposito ("feedback enviado e registro
-- historico"). Isso continua valendo: a triagem e feita pelo CLI, que usa
-- service_role e passa por cima da RLS. Nenhuma policy nova aqui.

-- -----------------------------------------------------------------------------
-- 3. Conquistas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conquistas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Chave no catalogo de src/lib/conquistas.ts. TEXT com CHECK, e nao uma
  -- tabela de catalogo, pelo mesmo motivo da 058: o catalogo tem 1 item hoje
  -- e muda junto com o codigo que o desenha.
  tipo        TEXT NOT NULL,
  -- Qual feedback gerou. SET NULL porque apagar spam nao deve tirar a
  -- insignia de quem ja ganhou.
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  versao      TEXT,
  -- Se a pessoa ja viu a tela de comemoracao. A insignia continua no perfil
  -- pra sempre; isto controla so o modal.
  vista       BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conquistas DROP CONSTRAINT IF EXISTS conquistas_tipo_check;
ALTER TABLE public.conquistas
  ADD CONSTRAINT conquistas_tipo_check
  CHECK (tipo IN ('feedback_implementado'));

-- Um feedback premia uma vez. Sem isto, rodar o comando do CLI duas vezes na
-- mesma lista daria duas insignias e dois modais pra mesma pessoa.
CREATE UNIQUE INDEX IF NOT EXISTS conquistas_feedback_uniq
  ON public.conquistas (feedback_id)
  WHERE feedback_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conquistas_usuario_idx
  ON public.conquistas (usuario_id, criado_em DESC);

-- Parcial: a fila de avisos consulta exatamente isto a cada login.
CREATE INDEX IF NOT EXISTS conquistas_nao_vistas_idx
  ON public.conquistas (usuario_id)
  WHERE vista = false;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- Insignia e privada: so o dono enxerga.
--
-- Nao ha policy de INSERT nem de DELETE — sem policy, a RLS nega. Quem cria
-- conquista e o CLI, com service_role. Se o client pudesse inserir, qualquer
-- um se premiava sozinho pelo console do navegador.
--
-- O UPDATE existe so pra marcar `vista`, e por isso vem com privilegio de
-- COLUNA: a policy sozinha limita QUAIS LINHAS, nunca QUAIS COLUNAS. Sem o
-- GRANT restrito, um usuario poderia dar UPDATE em `tipo` ou `versao` da
-- propria conquista via PostgREST e forjar uma insignia que nunca ganhou.
-- -----------------------------------------------------------------------------

ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conquistas_select" ON public.conquistas;
CREATE POLICY "conquistas_select" ON public.conquistas
  FOR SELECT USING (
    usuario_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "conquistas_update_vista" ON public.conquistas;
CREATE POLICY "conquistas_update_vista" ON public.conquistas
  FOR UPDATE USING (
    usuario_id = (SELECT auth.uid())
  ) WITH CHECK (
    usuario_id = (SELECT auth.uid())
  );

-- O role `authenticated` e criado pelo Supabase, nao pelo Postgres. Num
-- self-hosted o bootstrap roda com ON_ERROR_STOP=1, entao um "role does not
-- exist" aqui abortaria a migration inteira e derrubaria as seguintes junto.
-- O guard deixa a tabela criada e a RLS ligada de qualquer jeito.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE UPDATE ON public.conquistas FROM authenticated;
    GRANT SELECT ON public.conquistas TO authenticated;
    GRANT UPDATE (vista) ON public.conquistas TO authenticated;
  END IF;
END
$$;

COMMIT;
