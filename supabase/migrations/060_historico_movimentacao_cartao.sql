-- =============================================================================
-- 060_historico_movimentacao_cartao.sql
-- -----------------------------------------------------------------------------
-- Toda mudanca de coluna de um cartao, gravada pelo BANCO.
--
-- Pedido dos feedbacks 1a93358f (Lucas: historico do cartao e quanto tempo
-- ele esta parado) e 9847728d (Eduardo: metricas de duracao a partir de
-- quando os cartoes sao movidos).
--
-- Por que um trigger, e nao mais uma chamada a registrarAtividade():
-- a tabela `atividades` ja recebia um "mover", mas so de UM caminho, o
-- use-cartoes.mover(). Pelo menos onze outros mudam `coluna_id` sem registrar
-- nada: backlog (mandar pra sprint, voltar, mover em lote), a reordenacao,
-- excluir coluna, o executor de automacoes, a API v1, o MCP, a sincronizacao
-- de PR e o webhook do GitHub. Um historico montado em cima disso teria
-- buracos, e uma metrica de tempo por coluna mentiria sem avisar. O trigger
-- pega todos, inclusive os que ainda nao existem, com o relogio do servidor.
--
-- Consultas uteis:
--
--   -- historico de um cartao
--   SELECT criado_em, tipo, coluna_origem_nome, coluna_destino_nome, usuario_id
--     FROM public.cartao_movimentacoes
--    WHERE cartao_id = '<uuid>' ORDER BY criado_em;
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cartao_movimentacoes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id           UUID NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  -- Copiado do cartao: a RLS e plana por workspace, igual a de `cartoes`.
  workspace_id        UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Quadro onde a movimentacao aconteceu. Nas metricas, filtra por sprint.
  quadro_id           UUID REFERENCES public.quadros(id) ON DELETE SET NULL,
  tipo                TEXT NOT NULL,
  -- id NULL + nome NULL = backlog (cartao sem coluna).
  coluna_origem_id    UUID REFERENCES public.colunas(id) ON DELETE SET NULL,
  coluna_destino_id   UUID REFERENCES public.colunas(id) ON DELETE SET NULL,
  -- Nomes copiados no momento do evento. Coluna e renomeada e excluida; sem
  -- isto o historico mudaria retroativamente, ou viraria uma lista de
  -- "coluna desconhecida" depois de uma limpeza de quadro.
  coluna_origem_nome  TEXT,
  coluna_destino_nome TEXT,
  -- NULL quando quem moveu nao foi uma pessoa logada: API v1, MCP,
  -- automacao, webhook do GitHub. FK pra perfis, e nao auth.users, pra que o
  -- PostgREST consiga embutir o nome.
  usuario_id          UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  -- true nas linhas reconstruidas a partir de `atividades` (ver abaixo).
  reconstruido        BOOLEAN NOT NULL DEFAULT false,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cartao_movimentacoes DROP CONSTRAINT IF EXISTS cartao_movimentacoes_tipo_check;
ALTER TABLE public.cartao_movimentacoes
  ADD CONSTRAINT cartao_movimentacoes_tipo_check CHECK (tipo IN ('criado', 'movido'));

-- O painel do cartao le por cartao; as metricas leem por workspace.
CREATE INDEX IF NOT EXISTS cartao_movimentacoes_cartao_idx
  ON public.cartao_movimentacoes (cartao_id, criado_em);
CREATE INDEX IF NOT EXISTS cartao_movimentacoes_workspace_idx
  ON public.cartao_movimentacoes (workspace_id, criado_em);

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER porque a tabela nao tem policy de INSERT: ninguem escreve
-- nela direto, so este gatilho.
--
-- O bloco EXCEPTION e a regra mais importante daqui: registrar historico
-- NUNCA pode impedir um cartao de ser movido. Se algo der errado (perfil
-- inexistente, coluna apagada no meio, auth.uid() indisponivel num
-- self-hosted), vira WARNING no log e o movimento segue.
CREATE OR REPLACE FUNCTION public.registrar_movimentacao_cartao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario     UUID;
  v_origem_nome TEXT;
  v_destino_nome TEXT;
  v_quadro      UUID;
BEGIN
  BEGIN
    -- So grava o usuario se ele tiver perfil; senao a FK derrubaria o insert.
    SELECT id INTO v_usuario FROM perfis WHERE id = auth.uid();

    SELECT nome, quadro_id INTO v_destino_nome, v_quadro
      FROM colunas WHERE id = NEW.coluna_id;

    IF TG_OP = 'UPDATE' THEN
      SELECT nome INTO v_origem_nome FROM colunas WHERE id = OLD.coluna_id;
      -- Mandou pro backlog: o destino nao tem quadro, entao vale o da origem.
      IF v_quadro IS NULL THEN
        SELECT quadro_id INTO v_quadro FROM colunas WHERE id = OLD.coluna_id;
      END IF;
    END IF;

    INSERT INTO cartao_movimentacoes (
      cartao_id, workspace_id, quadro_id, tipo,
      coluna_origem_id, coluna_origem_nome,
      coluna_destino_id, coluna_destino_nome,
      usuario_id
    ) VALUES (
      NEW.id, NEW.workspace_id, v_quadro,
      CASE WHEN TG_OP = 'INSERT' THEN 'criado' ELSE 'movido' END,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.coluna_id END, v_origem_nome,
      NEW.coluna_id, v_destino_nome,
      v_usuario
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'historico do cartao % nao registrado: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cartoes_historico_criacao ON public.cartoes;
CREATE TRIGGER cartoes_historico_criacao
  AFTER INSERT ON public.cartoes
  FOR EACH ROW EXECUTE FUNCTION public.registrar_movimentacao_cartao();

-- WHEN filtra na origem: a reordenacao grava `coluna_id` de todos os cartoes
-- da lista, inclusive dos que nao mudaram de coluna.
DROP TRIGGER IF EXISTS cartoes_historico_coluna ON public.cartoes;
CREATE TRIGGER cartoes_historico_coluna
  AFTER UPDATE OF coluna_id ON public.cartoes
  FOR EACH ROW
  WHEN (OLD.coluna_id IS DISTINCT FROM NEW.coluna_id)
  EXECUTE FUNCTION public.registrar_movimentacao_cartao();

-- -----------------------------------------------------------------------------
-- Preenchimento com o que ja se sabe
-- -----------------------------------------------------------------------------
-- Sem isto, todo cartao existente abriria com historico vazio. Duas fontes:
--
--   1. `atividades` com acao 'mover' — gravadas pelo client desde marco, com
--      coluna de origem, destino e autor. Incompletas (so um dos caminhos),
--      mas reais.
--   2. A criacao de cada cartao, com o horario exato de `cartoes.criado_em`.
--      A coluna inicial e INFERIDA: a origem do primeiro movimento conhecido,
--      ou a coluna atual se nunca se moveu.
--
-- Coluna que ja foi excluida vira "coluna removida", e nao NULL: NULL e o
-- jeito de dizer "backlog", e as duas coisas nao sao a mesma.
--
-- So roda com a tabela vazia, entao reaplicar a migration nao duplica nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cartao_movimentacoes) THEN
    RETURN;
  END IF;

  INSERT INTO public.cartao_movimentacoes (
    cartao_id, workspace_id, quadro_id, tipo,
    coluna_origem_id, coluna_origem_nome,
    coluna_destino_id, coluna_destino_nome,
    usuario_id, reconstruido, criado_em
  )
  SELECT
    a.cartao_id, c.workspace_id, a.quadro_id, 'movido',
    co.id, COALESCE(co.nome, CASE WHEN a.orig IS NOT NULL THEN 'coluna removida' END),
    cd.id, COALESCE(cd.nome, CASE WHEN a.dest IS NOT NULL THEN 'coluna removida' END),
    p.id, true, a.criado_em
  FROM (
    SELECT atv.*,
      -- Cast protegido: um valor fora do formato derrubaria a migration inteira.
      CASE WHEN atv.detalhes->>'coluna_origem_id' ~* '^[0-9a-f-]{36}$'
           THEN (atv.detalhes->>'coluna_origem_id')::uuid END AS orig,
      CASE WHEN atv.detalhes->>'coluna_destino_id' ~* '^[0-9a-f-]{36}$'
           THEN (atv.detalhes->>'coluna_destino_id')::uuid END AS dest
    FROM public.atividades atv
    WHERE atv.acao = 'mover' AND atv.entidade = 'cartao' AND atv.cartao_id IS NOT NULL
  ) a
  JOIN public.cartoes c ON c.id = a.cartao_id
  LEFT JOIN public.colunas co ON co.id = a.orig
  LEFT JOIN public.colunas cd ON cd.id = a.dest
  LEFT JOIN public.perfis p ON p.id = a.user_id;

  INSERT INTO public.cartao_movimentacoes (
    cartao_id, workspace_id, quadro_id, tipo,
    coluna_destino_id, coluna_destino_nome,
    reconstruido, criado_em
  )
  SELECT c.id, c.workspace_id, col.quadro_id, 'criado',
         col.id, col.nome, true, COALESCE(c.criado_em, now())
  FROM public.cartoes c
  -- `existe` separa "nunca se moveu" de "o primeiro movimento saiu do
  -- backlog": nos dois casos coluna_origem_id e NULL, e so o marcador diz
  -- qual e qual. Sem ele, cartao criado no backlog apareceria como criado na
  -- coluna em que esta hoje.
  LEFT JOIN LATERAL (
    SELECT true AS existe, m.coluna_origem_id
      FROM public.cartao_movimentacoes m
     WHERE m.cartao_id = c.id
     ORDER BY m.criado_em
     LIMIT 1
  ) primeiro ON true
  LEFT JOIN public.colunas col
    ON col.id = CASE WHEN primeiro.existe IS NULL THEN c.coluna_id
                     ELSE primeiro.coluna_origem_id END;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS — mesma regra plana de `cartoes`
-- -----------------------------------------------------------------------------
-- Sem policy de INSERT, UPDATE ou DELETE: historico nao se edita, e quem
-- escreve e o trigger acima.
ALTER TABLE public.cartao_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cartao_movimentacoes_select" ON public.cartao_movimentacoes;
CREATE POLICY "cartao_movimentacoes_select" ON public.cartao_movimentacoes
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

-- `authenticated` so existe no Supabase; num Postgres cru o GRANT abortaria a
-- migration inteira com ON_ERROR_STOP. Mesmo guard da 059.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE ON public.cartao_movimentacoes FROM authenticated;
    GRANT SELECT ON public.cartao_movimentacoes TO authenticated;
  END IF;
END
$$;

COMMIT;
