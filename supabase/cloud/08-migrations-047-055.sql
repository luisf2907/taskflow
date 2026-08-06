-- =====================================================================
-- Taskflow — migrations 047 a 055 (consolidado para Supabase)
-- =====================================================================
-- O 02-schema.sql foi extraido do bootstrap.sql, que e um dump parado
-- na migration 046. Tudo que veio depois esta AQUI:
--
--   047  views salvas
--   048  busca global (search_vector + buscar_global)
--   049  subtarefas e dependencias entre cards
--   050  epicos
--   051  campos customizados
--   052  grafo de dependencias (quadro)
--   053  grafo de dependencias (workspace)
--   054  cards sem dependencia
--   055  get_board_data — RPC unica de leitura do board
--
-- Sem este arquivo o app sobe SEM essas features, e o board cai no
-- caminho lento de ~10 queries em vez de 1.
--
-- Rodar DEPOIS do 07. Cada migration tem seu proprio BEGIN/COMMIT,
-- entao sao nove transacoes independentes — se uma falhar, as
-- anteriores permanecem aplicadas.
--
-- Os ALTER PUBLICATION supabase_realtime das 049 e 051 funcionam aqui
-- porque o Supabase cria essa publicacao. (No self-hosted do repo ela
-- nao existe e e criada pelo scripts/bootstrap.sh.)
-- =====================================================================


-- =====================================================================
-- 047_views_salvas.sql
-- =====================================================================

-- =============================================
-- 047: Views salvas (filtros nomeados)
-- Permite usuários salvarem combinações de filtros
-- como views nomeadas (pessoais ou compartilhadas).
-- =============================================

BEGIN;

-- =============================================
-- TABELA: views_salvas
-- Uma view = nome + filtros (JSONB) + escopo (quadro ou workspace inteiro)
-- =============================================
CREATE TABLE IF NOT EXISTS views_salvas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  compartilhada BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Mesmo usuário não pode ter duas views com mesmo nome no mesmo escopo
  CONSTRAINT views_salvas_nome_unico UNIQUE (usuario_id, quadro_id, nome)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_views_salvas_workspace ON views_salvas(workspace_id);
CREATE INDEX idx_views_salvas_quadro ON views_salvas(quadro_id) WHERE quadro_id IS NOT NULL;
CREATE INDEX idx_views_salvas_usuario ON views_salvas(usuario_id);
-- Para o listing: views minhas + compartilhadas no workspace
CREATE INDEX idx_views_salvas_listing
  ON views_salvas(workspace_id, quadro_id, compartilhada);

-- =============================================
-- TRIGGER: atualizado_em
-- =============================================
CREATE OR REPLACE FUNCTION update_views_salvas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_views_salvas_updated_at
  BEFORE UPDATE ON views_salvas
  FOR EACH ROW
  EXECUTE FUNCTION update_views_salvas_updated_at();

-- =============================================
-- RLS
-- SELECT: workspace_id deve ser meu E (sou o dono OU é compartilhada)
-- INSERT: workspace_id deve ser meu E usuario_id = eu
-- UPDATE/DELETE: só o dono
-- =============================================
ALTER TABLE views_salvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "views_salvas_select" ON views_salvas
  FOR SELECT USING (
    workspace_id IN (SELECT my_workspace_ids())
    AND (usuario_id = (SELECT auth.uid()) OR compartilhada = true)
  );

CREATE POLICY "views_salvas_insert" ON views_salvas
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT my_workspace_ids())
    AND usuario_id = (SELECT auth.uid())
  );

CREATE POLICY "views_salvas_update" ON views_salvas
  FOR UPDATE USING (
    usuario_id = (SELECT auth.uid())
  );

CREATE POLICY "views_salvas_delete" ON views_salvas
  FOR DELETE USING (
    usuario_id = (SELECT auth.uid())
  );

COMMIT;


-- =====================================================================
-- 048_busca_global.sql
-- =====================================================================

-- =============================================
-- 048: Busca global instantânea (full-text search)
-- Adiciona tsvector columns + GIN indexes em cartoes, wiki_paginas e
-- comentarios. Função buscar_global() faz UNION ALL ranqueado.
-- =============================================

BEGIN;

-- =============================================
-- CARTOES — tsvector(titulo:A, descricao:B)
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(descricao, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_cartoes_search
  ON cartoes USING GIN (search_vector);

-- =============================================
-- WIKI_PAGINAS — tsvector(titulo:A, conteudo:B)
-- conteudo é JSONB (TipTap). jsonb_to_tsvector extrai todas as strings.
-- =============================================
ALTER TABLE wiki_paginas
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
    setweight(
      jsonb_to_tsvector('portuguese', coalesce(conteudo, '{}'::jsonb), '["string"]'),
      'B'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_wiki_paginas_search
  ON wiki_paginas USING GIN (search_vector);

-- =============================================
-- COMENTARIOS — tsvector(texto:B)
-- =============================================
ALTER TABLE comentarios
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(texto, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_comentarios_search
  ON comentarios USING GIN (search_vector);

-- =============================================
-- FUNÇÃO: buscar_global(termo, limit_total)
-- Retorna UNION ALL ranqueado de cartoes + wiki_paginas + comentarios.
-- SECURITY INVOKER: respeita RLS do usuário (não vaza entre workspaces).
-- =============================================
CREATE OR REPLACE FUNCTION buscar_global(
  termo text,
  limit_total integer DEFAULT 30
)
RETURNS TABLE (
  tipo text,
  id uuid,
  workspace_id uuid,
  titulo text,
  snippet text,
  quadro_id uuid,
  slug text,
  cartao_id uuid,
  rank real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('portuguese', termo) AS tsq
  )
  -- Cartões
  SELECT
    'cartao'::text                        AS tipo,
    c.id                                  AS id,
    c.workspace_id                        AS workspace_id,
    c.titulo                              AS titulo,
    ts_headline(
      'portuguese',
      coalesce(c.descricao, c.titulo),
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    )                                     AS snippet,
    col.quadro_id                         AS quadro_id,
    NULL::text                            AS slug,
    NULL::uuid                            AS cartao_id,
    ts_rank(c.search_vector, q.tsq) * 1.5 AS rank  -- boost cartões
  FROM cartoes c
  LEFT JOIN colunas col ON col.id = c.coluna_id
  CROSS JOIN q
  WHERE c.search_vector @@ q.tsq

  UNION ALL

  -- Wiki
  SELECT
    'wiki'::text,
    w.id,
    w.workspace_id,
    w.titulo,
    ts_headline(
      'portuguese',
      w.titulo,
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    ),
    NULL::uuid,
    w.slug,
    NULL::uuid,
    ts_rank(w.search_vector, q.tsq)
  FROM wiki_paginas w
  CROSS JOIN q
  WHERE w.search_vector @@ q.tsq

  UNION ALL

  -- Comentários (workspace via JOIN com cartoes)
  SELECT
    'comentario'::text,
    cm.id,
    ca.workspace_id,
    left(cm.texto, 60),  -- preview pra fallback
    ts_headline(
      'portuguese',
      cm.texto,
      q.tsq,
      'MaxFragments=1,MaxWords=18,MinWords=4,ShortWord=2,StartSel=«,StopSel=»'
    ),
    col.quadro_id,
    NULL::text,
    cm.cartao_id,
    ts_rank(cm.search_vector, q.tsq) * 0.7  -- comentários têm menos peso
  FROM comentarios cm
  JOIN cartoes ca ON ca.id = cm.cartao_id
  LEFT JOIN colunas col ON col.id = ca.coluna_id
  CROSS JOIN q
  WHERE cm.search_vector @@ q.tsq

  ORDER BY rank DESC
  LIMIT limit_total;
$$;

-- Permite execução pra usuários autenticados (a RLS interna filtra)
GRANT EXECUTE ON FUNCTION buscar_global(text, integer) TO authenticated;

COMMIT;


-- =====================================================================
-- 049_subtarefas_dependencias.sql
-- =====================================================================

-- =============================================
-- 049: Subtarefas e dependências entre cards
-- - cartao_pai_id em cartoes (self-reference, ON DELETE SET NULL)
-- - cartao_dependencias: tabela de relação NxN entre cards
-- =============================================

BEGIN;

-- =============================================
-- SUBTAREFAS — coluna self-reference em cartoes
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS cartao_pai_id UUID
    REFERENCES cartoes(id) ON DELETE SET NULL;

-- Index para queries "filhos deste card" (subtarefas)
CREATE INDEX IF NOT EXISTS idx_cartoes_pai_id
  ON cartoes(cartao_pai_id)
  WHERE cartao_pai_id IS NOT NULL;

-- =============================================
-- DEPENDÊNCIAS — relação NxN
-- "cartao_id depende de depende_de_cartao_id"
-- Quer dizer: cartao_id está BLOQUEADO até depende_de_cartao_id ser concluído.
-- =============================================
CREATE TABLE IF NOT EXISTS cartao_dependencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  depende_de_cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES perfis(id) ON DELETE SET NULL,

  -- Não permite dependência circular trivial (auto-referência)
  CONSTRAINT cartao_dependencias_no_self_loop
    CHECK (cartao_id <> depende_de_cartao_id),

  -- Não permite a mesma dependência duplicada
  CONSTRAINT cartao_dependencias_unica
    UNIQUE (cartao_id, depende_de_cartao_id)
);

CREATE INDEX IF NOT EXISTS idx_cartao_deps_cartao
  ON cartao_dependencias(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_deps_depende_de
  ON cartao_dependencias(depende_de_cartao_id);

-- =============================================
-- RLS — só vê deps de cards que pertencem a workspace meu
-- =============================================
ALTER TABLE cartao_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cartao_dependencias_all" ON cartao_dependencias
  FOR ALL
  USING (
    cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
    AND depende_de_cartao_id IN (
      SELECT id FROM cartoes
      WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- =============================================
-- FUNÇÃO HELPER — retorna se um card está bloqueado
-- Bloqueado = tem pelo menos uma dependência aberta (data_conclusao IS NULL)
-- =============================================
CREATE OR REPLACE FUNCTION card_bloqueado(card_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM cartao_dependencias d
    JOIN cartoes c ON c.id = d.depende_de_cartao_id
    WHERE d.cartao_id = card_id
      AND c.data_conclusao IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION card_bloqueado(UUID) TO authenticated;

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE cartao_dependencias;

COMMIT;


-- =====================================================================
-- 050_epicos.sql
-- =====================================================================

-- =============================================
-- 050: Épicos como marcador em cartoes
-- Reusa cartao_pai_id (migration 049). Cards marcados como épico ganham
-- uma cor da paleta curada. Filhos herdam visualmente a cor do épico.
-- =============================================

BEGIN;

-- =============================================
-- Colunas em cartoes
-- =============================================
ALTER TABLE cartoes
  ADD COLUMN IF NOT EXISTS eh_epico BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cor_epico TEXT NULL;

-- =============================================
-- Index para listar épicos do workspace rapidamente
-- =============================================
CREATE INDEX IF NOT EXISTS idx_cartoes_epicos
  ON cartoes(workspace_id, eh_epico)
  WHERE eh_epico = true;

-- =============================================
-- Função helper — conta épicos ativos do workspace
-- (épico ativo = eh_epico AND não concluído)
-- Usada pelo frontend pra checar limite antes de criar.
-- =============================================
CREATE OR REPLACE FUNCTION contar_epicos_ativos(ws_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM cartoes
  WHERE workspace_id = ws_id
    AND eh_epico = true
    AND data_conclusao IS NULL;
$$;

GRANT EXECUTE ON FUNCTION contar_epicos_ativos(UUID) TO authenticated;

COMMIT;


-- =====================================================================
-- 051_campos_customizados.sql
-- =====================================================================

-- =============================================
-- 051: Campos customizados por workspace
-- Admin define campos (texto, número, data, select, checkbox) que
-- aparecem em todos os cards do workspace. Valores armazenados como
-- JSONB pra flexibilidade entre tipos.
-- =============================================

BEGIN;

-- =============================================
-- TABELA: campos_customizados
-- Definição do campo (compartilhada entre cards do workspace).
-- =============================================
CREATE TABLE IF NOT EXISTS campos_customizados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'numero', 'data', 'select', 'checkbox')),
  opcoes JSONB DEFAULT NULL,  -- array de strings pra tipo 'select'
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Nome único por workspace
  CONSTRAINT campos_customizados_nome_unico UNIQUE (workspace_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_campos_customizados_workspace
  ON campos_customizados(workspace_id, posicao);

-- =============================================
-- TABELA: cartao_campos_valores
-- Valor de um campo customizado pra um card específico.
-- valor JSONB porque o formato depende do tipo do campo.
-- =============================================
CREATE TABLE IF NOT EXISTS cartao_campos_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES campos_customizados(id) ON DELETE CASCADE,
  valor JSONB DEFAULT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT now(),

  -- Um valor por (cartao, campo)
  CONSTRAINT cartao_campos_valores_unico UNIQUE (cartao_id, campo_id)
);

CREATE INDEX IF NOT EXISTS idx_cartao_campos_valores_cartao
  ON cartao_campos_valores(cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartao_campos_valores_campo
  ON cartao_campos_valores(campo_id);

-- =============================================
-- TRIGGERS — atualizado_em
-- =============================================
CREATE OR REPLACE FUNCTION update_campos_customizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campos_customizados_updated_at
  BEFORE UPDATE ON campos_customizados
  FOR EACH ROW
  EXECUTE FUNCTION update_campos_customizados_updated_at();

CREATE OR REPLACE FUNCTION update_cartao_campos_valores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cartao_campos_valores_updated_at
  BEFORE UPDATE ON cartao_campos_valores
  FOR EACH ROW
  EXECUTE FUNCTION update_cartao_campos_valores_updated_at();

-- =============================================
-- RLS
-- =============================================
ALTER TABLE campos_customizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campos_customizados_select" ON campos_customizados
  FOR SELECT USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_insert" ON campos_customizados
  FOR INSERT WITH CHECK (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_update" ON campos_customizados
  FOR UPDATE USING (workspace_id IN (SELECT my_workspace_ids()));

CREATE POLICY "campos_customizados_delete" ON campos_customizados
  FOR DELETE USING (workspace_id IN (SELECT my_workspace_ids()));

ALTER TABLE cartao_campos_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cartao_campos_valores_all" ON cartao_campos_valores
  FOR ALL
  USING (
    cartao_id IN (
      SELECT id FROM cartoes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  )
  WITH CHECK (
    cartao_id IN (
      SELECT id FROM cartoes WHERE workspace_id IN (SELECT my_workspace_ids())
    )
  );

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE campos_customizados;
ALTER PUBLICATION supabase_realtime ADD TABLE cartao_campos_valores;

COMMIT;


-- =====================================================================
-- 052_grafo_dependencias.sql
-- =====================================================================

-- =============================================
-- 052: Grafo de dependências
-- RPC que faz traversal recursivo (BFS) a partir de um card,
-- alcançando todos os nós conectados por dependência em AMBAS as
-- direções (depende de / bloqueia), com profundidade limitada.
-- Retorna os nós (cards) + as arestas (dependências).
-- =============================================

BEGIN;

-- =============================================
-- FUNÇÃO: grafo_dependencias(card_id, max_profundidade)
-- Retorna duas "seções" via coluna `tipo_linha`:
--   'no'    → um card alcançável (com contexto de coluna/sprint/épico)
--   'aresta'→ uma dependência (cartao_id depende de depende_de_cartao_id)
-- SECURITY INVOKER respeita RLS do usuário.
-- =============================================
CREATE OR REPLACE FUNCTION grafo_dependencias(
  card_id UUID,
  max_profundidade INTEGER DEFAULT 6
)
RETURNS TABLE (
  tipo_linha TEXT,
  -- Campos de nó:
  no_id UUID,
  no_titulo TEXT,
  no_data_conclusao TIMESTAMPTZ,
  no_coluna_nome TEXT,
  no_quadro_id UUID,
  no_quadro_nome TEXT,
  no_eh_epico BOOLEAN,
  no_cor_epico TEXT,
  no_profundidade INTEGER,
  -- Campos de aresta:
  aresta_origem UUID,
  aresta_destino UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH RECURSIVE alcancaveis AS (
    -- Nó raiz
    SELECT card_id AS id, 0 AS profundidade
    UNION
    -- Expande em ambas as direções
    SELECT prox.id, a.profundidade + 1
    FROM alcancaveis a
    JOIN LATERAL (
      -- cards que `a` depende
      SELECT d.depende_de_cartao_id AS id
      FROM cartao_dependencias d
      WHERE d.cartao_id = a.id
      UNION
      -- cards que dependem de `a`
      SELECT d.cartao_id AS id
      FROM cartao_dependencias d
      WHERE d.depende_de_cartao_id = a.id
    ) prox ON true
    WHERE a.profundidade < max_profundidade
  ),
  -- Profundidade mínima por nó (pode ser alcançado por vários caminhos)
  nos_unicos AS (
    SELECT id, MIN(profundidade) AS profundidade
    FROM alcancaveis
    GROUP BY id
  )
  -- Seção de NÓS
  SELECT
    'no'::text                       AS tipo_linha,
    c.id                             AS no_id,
    c.titulo                         AS no_titulo,
    c.data_conclusao                 AS no_data_conclusao,
    col.nome                         AS no_coluna_nome,
    col.quadro_id                    AS no_quadro_id,
    q.nome                           AS no_quadro_nome,
    c.eh_epico                       AS no_eh_epico,
    c.cor_epico                      AS no_cor_epico,
    n.profundidade                   AS no_profundidade,
    NULL::uuid                       AS aresta_origem,
    NULL::uuid                       AS aresta_destino
  FROM nos_unicos n
  JOIN cartoes c ON c.id = n.id
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id

  UNION ALL

  -- Seção de ARESTAS (só entre nós alcançados)
  SELECT
    'aresta'::text                   AS tipo_linha,
    NULL::uuid, NULL::text, NULL::timestamptz, NULL::text,
    NULL::uuid, NULL::text, NULL::boolean, NULL::text, NULL::integer,
    d.cartao_id                      AS aresta_origem,
    d.depende_de_cartao_id           AS aresta_destino
  FROM cartao_dependencias d
  WHERE d.cartao_id IN (SELECT id FROM nos_unicos)
    AND d.depende_de_cartao_id IN (SELECT id FROM nos_unicos);
$$;

GRANT EXECUTE ON FUNCTION grafo_dependencias(UUID, INTEGER) TO authenticated;

COMMIT;


-- =====================================================================
-- 053_grafo_workspace.sql
-- =====================================================================

-- =============================================
-- 053: Grafo de dependências — escopo workspace inteiro
-- RPC que retorna TODOS os cards do workspace que participam de alguma
-- dependência (como origem ou destino) + todas as arestas. Inclui o
-- épico resolvido de cada card (próprio se eh_epico, senão herdado do
-- pai) pra permitir filtro por épico no frontend.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION grafo_dependencias_workspace(ws_id UUID)
RETURNS TABLE (
  tipo_linha TEXT,
  no_id UUID,
  no_titulo TEXT,
  no_data_conclusao TIMESTAMPTZ,
  no_coluna_nome TEXT,
  no_quadro_id UUID,
  no_quadro_nome TEXT,
  no_epico_id UUID,
  no_epico_cor TEXT,
  no_epico_titulo TEXT,
  aresta_origem UUID,
  aresta_destino UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH deps AS (
    -- Todas as dependências cujo lado "origem" pertence ao workspace.
    -- (origem e destino são sempre do mesmo workspace por construção da UI.)
    SELECT d.cartao_id, d.depende_de_cartao_id
    FROM cartao_dependencias d
    JOIN cartoes c ON c.id = d.cartao_id
    WHERE c.workspace_id = ws_id
  ),
  -- Conjunto de cards que participam (origem OU destino)
  ids AS (
    SELECT cartao_id AS id FROM deps
    UNION
    SELECT depende_de_cartao_id AS id FROM deps
  )
  -- NÓS
  SELECT
    'no'::text                                   AS tipo_linha,
    c.id                                         AS no_id,
    c.titulo                                     AS no_titulo,
    c.data_conclusao                             AS no_data_conclusao,
    col.nome                                     AS no_coluna_nome,
    col.quadro_id                                AS no_quadro_id,
    q.nome                                       AS no_quadro_nome,
    -- épico resolvido: ele mesmo se épico, senão o pai (se for épico)
    CASE WHEN c.eh_epico THEN c.id
         WHEN pai.id IS NOT NULL THEN pai.id
         ELSE NULL END                           AS no_epico_id,
    CASE WHEN c.eh_epico THEN c.cor_epico
         WHEN pai.id IS NOT NULL THEN pai.cor_epico
         ELSE NULL END                           AS no_epico_cor,
    CASE WHEN c.eh_epico THEN c.titulo
         WHEN pai.id IS NOT NULL THEN pai.titulo
         ELSE NULL END                           AS no_epico_titulo,
    NULL::uuid                                   AS aresta_origem,
    NULL::uuid                                   AS aresta_destino
  FROM ids
  JOIN cartoes c ON c.id = ids.id
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id
  LEFT JOIN cartoes pai ON pai.id = c.cartao_pai_id AND pai.eh_epico = true

  UNION ALL

  -- ARESTAS
  SELECT
    'aresta'::text,
    NULL::uuid, NULL::text, NULL::timestamptz, NULL::text,
    NULL::uuid, NULL::text, NULL::uuid, NULL::text, NULL::text,
    deps.cartao_id              AS aresta_origem,
    deps.depende_de_cartao_id   AS aresta_destino
  FROM deps;
$$;

GRANT EXECUTE ON FUNCTION grafo_dependencias_workspace(UUID) TO authenticated;

COMMIT;


-- =====================================================================
-- 054_cards_sem_dep.sql
-- =====================================================================

-- =============================================
-- 054: Cards sem dependência (pra bandeja da view de Deps)
-- Retorna as tarefas do workspace que NÃO participam de nenhuma
-- dependência (nem origem nem destino) e não são épicos. Usado pra
-- mostrar "trabalho independente" separado do grafo.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION cards_sem_dependencia_workspace(ws_id UUID)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  data_conclusao TIMESTAMPTZ,
  coluna_nome TEXT,
  quadro_id UUID,
  quadro_nome TEXT,
  epico_id UUID,
  epico_cor TEXT,
  epico_titulo TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.titulo,
    c.data_conclusao,
    col.nome                                     AS coluna_nome,
    col.quadro_id                                AS quadro_id,
    q.nome                                       AS quadro_nome,
    CASE WHEN c.eh_epico THEN c.id
         WHEN pai.id IS NOT NULL THEN pai.id
         ELSE NULL END                           AS epico_id,
    CASE WHEN c.eh_epico THEN c.cor_epico
         WHEN pai.id IS NOT NULL THEN pai.cor_epico
         ELSE NULL END                           AS epico_cor,
    CASE WHEN c.eh_epico THEN c.titulo
         WHEN pai.id IS NOT NULL THEN pai.titulo
         ELSE NULL END                           AS epico_titulo
  FROM cartoes c
  LEFT JOIN colunas col ON col.id = c.coluna_id
  LEFT JOIN quadros q ON q.id = col.quadro_id
  LEFT JOIN cartoes pai ON pai.id = c.cartao_pai_id AND pai.eh_epico = true
  WHERE c.workspace_id = ws_id
    AND c.eh_epico = false
    AND c.id NOT IN (
      SELECT cartao_id FROM cartao_dependencias
      UNION
      SELECT depende_de_cartao_id FROM cartao_dependencias
    )
  ORDER BY c.criado_em DESC;
$$;

GRANT EXECUTE ON FUNCTION cards_sem_dependencia_workspace(UUID) TO authenticated;

COMMIT;


-- =====================================================================
-- 055_board_rpc.sql
-- =====================================================================

-- =============================================
-- 055: RPC get_board_data — leitura do board em 1 round-trip
--
-- Antes, abrir /quadro/[id] disparava uma cascata sequencial no client:
--
--   getUser  ->  workspace_usuarios  ->  quadros   (pra descobrir o
--                                                   workspace_id do board)
--   colunas
--   cartoes  ->  checklists + anexos  ->  cartoes (pais dos epicos)
--
-- Cada seta e um round-trip. Esta funcao devolve quadro + colunas +
-- cartoes ja enriquecidos (etiquetas, membros, contagem de checklist,
-- anexos e cor/titulo do epico) numa unica chamada.
--
-- SECURITY INVOKER de proposito: as policies de RLS de quadros, colunas,
-- cartoes, cartao_etiquetas, cartao_membros, checklists e anexos
-- continuam valendo, exatamente como quando o client consultava cada
-- tabela direto. Um SECURITY DEFINER aqui deixaria qualquer usuario
-- autenticado ler qualquer board por id.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_board_data(p_quadro_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH cards AS (
    SELECT c.*
    FROM cartoes c
    JOIN colunas col ON col.id = c.coluna_id
    WHERE col.quadro_id = p_quadro_id
    ORDER BY c.posicao
    LIMIT 500
  ),
  etiq AS (
    SELECT ce.cartao_id, array_agg(ce.etiqueta_id) AS ids
    FROM cartao_etiquetas ce
    JOIN cards ON cards.id = ce.cartao_id
    GROUP BY ce.cartao_id
  ),
  memb AS (
    -- DISTINCT: o client fazia [...new Set(...)] porque um membro pode
    -- aparecer duplicado em cartao_membros.
    SELECT cm.cartao_id, array_agg(DISTINCT cm.membro_id) AS ids
    FROM cartao_membros cm
    JOIN cards ON cards.id = cm.cartao_id
    GROUP BY cm.cartao_id
  ),
  chk AS (
    -- Soma os itens de TODAS as checklists do card (era o mesmo no JS).
    SELECT
      cl.cartao_id,
      COUNT(ci.id)::INT AS total,
      COUNT(ci.id) FILTER (WHERE ci.concluido)::INT AS concluidos
    FROM checklists cl
    JOIN cards ON cards.id = cl.cartao_id
    LEFT JOIN checklist_itens ci ON ci.checklist_id = cl.id
    GROUP BY cl.cartao_id
  ),
  anx AS (
    SELECT a.cartao_id, COUNT(*)::INT AS total
    FROM anexos a
    JOIN cards ON cards.id = a.cartao_id
    GROUP BY a.cartao_id
  ),
  -- Pais que sao epicos, pra herdar cor/titulo nos filhos.
  pais AS (
    SELECT p.id, p.cor_epico, p.titulo
    FROM cartoes p
    WHERE p.eh_epico
      AND p.id IN (
        SELECT DISTINCT cards.cartao_pai_id
        FROM cards
        WHERE cards.cartao_pai_id IS NOT NULL
          AND cards.cartao_pai_id <> cards.id
      )
  )
  SELECT jsonb_build_object(
    'quadro', (SELECT to_jsonb(q) FROM quadros q WHERE q.id = p_quadro_id),

    'colunas', COALESCE((
      SELECT jsonb_agg(to_jsonb(col) ORDER BY col.posicao)
      FROM colunas col
      WHERE col.quadro_id = p_quadro_id
    ), '[]'::jsonb),

    'cartoes', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(cards) || jsonb_build_object(
          'etiqueta_ids', COALESCE(to_jsonb(etiq.ids), '[]'::jsonb),
          'membro_ids', COALESCE(to_jsonb(memb.ids), '[]'::jsonb),
          'total_checklist_itens', COALESCE(chk.total, 0),
          'total_checklist_concluidos', COALESCE(chk.concluidos, 0),
          'total_anexos', COALESCE(anx.total, 0),
          -- Epico proprio tem precedencia; senao herda do pai (que so
          -- entra em `pais` se for epico). Mesma regra do fetchCartoes.
          'epico_cor', CASE
            WHEN cards.eh_epico AND cards.cor_epico IS NOT NULL THEN cards.cor_epico
            ELSE pais.cor_epico
          END,
          'epico_titulo', CASE
            WHEN cards.eh_epico AND cards.cor_epico IS NOT NULL THEN cards.titulo
            ELSE pais.titulo
          END
        )
        ORDER BY cards.posicao
      )
      FROM cards
      LEFT JOIN etiq ON etiq.cartao_id = cards.id
      LEFT JOIN memb ON memb.cartao_id = cards.id
      LEFT JOIN chk  ON chk.cartao_id  = cards.id
      LEFT JOIN anx  ON anx.cartao_id  = cards.id
      LEFT JOIN pais ON pais.id = cards.cartao_pai_id
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_board_data(UUID) IS
  'Board completo (quadro + colunas + cartoes enriquecidos) em 1 chamada. Respeita RLS.';

COMMIT;
