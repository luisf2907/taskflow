-- =============================================================================
-- 034_audit_remediation.sql
-- Correções de integridade, RLS e housekeeping baseadas na auditoria do schema.
--
-- REGRAS DESTA MIGRATION:
--  * Idempotente (pode rodar 2x sem quebrar).
--  * Transacional: tudo-ou-nada.
--  * Seções marcadas como [DESTRUTIVO] estão COMENTADAS. Leia antes de ativar.
--  * Nada aqui dropa dados existentes sem aviso.
--
-- Para aplicar:
--   supabase db push    -- ou rodar no SQL Editor
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. REVOGAR PRIVILÉGIOS DE `anon` (defense in depth)
--    Se alguma tabela perder RLS no futuro, o anon não consegue mais ler tudo.
--    `authenticated` e `service_role` mantêm acesso — a RLS continua sendo a
--    barreira primária.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.tablename);
  END LOOP;
END $$;

-- Se você realmente precisar que anon leia algo (ex: landing page pública),
-- re-conceda explicitamente aqui. Exemplo:
-- GRANT SELECT ON TABLE public.workspaces_publicos TO anon;

REVOKE ALL ON FUNCTION public.my_workspace_ids()        FROM anon;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid)  FROM anon;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.debug_whoami()            FROM anon;


-- -----------------------------------------------------------------------------
-- 2. RLS: workspace_usuarios — impedir auto-inscrição em workspace alheio
--    Antes: (user_id = auth.uid() OR is_workspace_admin) — permitia virar
--    membro de qualquer workspace só sabendo o id.
--    Depois: apenas admins inserem membros. Convites devem passar pela RPC
--    `redeem_invite_link` abaixo.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "ws_usuarios_insert" ON public.workspace_usuarios;
CREATE POLICY "ws_usuarios_insert"
  ON public.workspace_usuarios
  FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

-- RPC para redimir invite link (SECURITY DEFINER bypassa a policy acima).
CREATE OR REPLACE FUNCTION public.redeem_invite_link(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.invite_links%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_invite
  FROM public.invite_links
  WHERE code = p_code
    AND ativo = true
    AND expira_em > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_invalid_or_expired' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.workspace_usuarios (workspace_id, user_id, papel)
  VALUES (v_invite.workspace_id, v_user_id, 'membro')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_invite.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_invite_link(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_link(text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. RLS: notificacoes — impedir criação de notificação para outro usuário
--    Antes: WITH CHECK (true). Depois: só auto-notificação direta; para
--    notificar outros usuários, usar a RPC `criar_notificacao` que valida
--    se o caller compartilha workspace com o destinatário.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "notificacoes_insert" ON public.notificacoes;
CREATE POLICY "notificacoes_insert"
  ON public.notificacoes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());  -- só self; cross-user via RPC abaixo

CREATE OR REPLACE FUNCTION public.criar_notificacao(
  p_user_id  uuid,
  p_titulo   text,
  p_mensagem text DEFAULT NULL,
  p_tipo     text DEFAULT 'info',
  p_link     text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_id     uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Self-notify: sempre permitido.
  -- Cross-user: só se ambos compartilham algum workspace.
  IF v_caller <> p_user_id THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.workspace_usuarios wu1
      JOIN public.workspace_usuarios wu2
        ON wu1.workspace_id = wu2.workspace_id
      WHERE wu1.user_id = v_caller
        AND wu2.user_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'notify_not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, link)
  VALUES (p_user_id, p_titulo, p_mensagem, p_tipo, p_link)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_notificacao(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_notificacao(uuid, text, text, text, text) TO authenticated;


-- -----------------------------------------------------------------------------
-- 4. RLS: automacao_logs — restringir a workspaces do usuário
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "automacao_logs_insert" ON public.automacao_logs;
CREATE POLICY "automacao_logs_insert"
  ON public.automacao_logs
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));


-- -----------------------------------------------------------------------------
-- 5. RLS: adicionar WITH CHECK nas policies UPDATE para evitar cross-tenant
--    (mover linhas entre workspaces via UPDATE).
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cartoes_update" ON public.cartoes;
CREATE POLICY "cartoes_update" ON public.cartoes
  FOR UPDATE
  USING      (workspace_id IN (SELECT public.my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

DROP POLICY IF EXISTS "automacoes_update" ON public.automacoes;
CREATE POLICY "automacoes_update" ON public.automacoes
  FOR UPDATE
  USING      (workspace_id IN (SELECT public.my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

DROP POLICY IF EXISTS "colunas_update" ON public.colunas;
CREATE POLICY "colunas_update" ON public.colunas
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.quadros q
    WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT public.my_workspace_ids())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quadros q
    WHERE q.id = colunas.quadro_id
      AND q.workspace_id IN (SELECT public.my_workspace_ids())
  ));

DROP POLICY IF EXISTS "poker_sessoes_update" ON public.poker_sessoes;
CREATE POLICY "poker_sessoes_update" ON public.poker_sessoes
  FOR UPDATE
  USING      (workspace_id IN (SELECT public.my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

DROP POLICY IF EXISTS "quadros_update" ON public.quadros;
CREATE POLICY "quadros_update" ON public.quadros
  FOR UPDATE
  USING      (workspace_id IN (SELECT public.my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.my_workspace_ids()));

DROP POLICY IF EXISTS "ws_usuarios_update" ON public.workspace_usuarios;
CREATE POLICY "ws_usuarios_update" ON public.workspace_usuarios
  FOR UPDATE
  USING      (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));


-- -----------------------------------------------------------------------------
-- 6. RLS: workspaces_update — só admins
--    Antes: qualquer membro podia editar nome/cor/ícone.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE
  USING      (public.is_workspace_admin(id))
  WITH CHECK (public.is_workspace_admin(id));


-- -----------------------------------------------------------------------------
-- 7. RLS: perfis_select — não expor e-mails do mundo inteiro
--    Novo: lê o próprio perfil OU perfis que compartilham workspace com você.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
CREATE POLICY "perfis_select" ON public.perfis
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_usuarios wu1
      JOIN public.workspace_usuarios wu2
        ON wu1.workspace_id = wu2.workspace_id
      WHERE wu1.user_id = auth.uid()
        AND wu2.user_id = perfis.id
    )
  );


-- -----------------------------------------------------------------------------
-- 8. FK: cartoes.branch_repo_id — padronizar ON DELETE SET NULL
--    (espelho do pr_repo_id, que já é SET NULL).
-- -----------------------------------------------------------------------------

ALTER TABLE public.cartoes
  DROP CONSTRAINT IF EXISTS cartoes_branch_repo_id_fkey;

ALTER TABLE public.cartoes
  ADD CONSTRAINT cartoes_branch_repo_id_fkey
  FOREIGN KEY (branch_repo_id) REFERENCES public.repositorios(id)
  ON DELETE SET NULL;


-- -----------------------------------------------------------------------------
-- 9. FKs para perfis sem ON DELETE — deleção de usuário bloqueava em cascata.
--    Estratégia: SET NULL + tornar colunas nullable quando não forem chave.
-- -----------------------------------------------------------------------------

-- atividades.user_id: hoje NOT NULL. Afrouxar para permitir histórico
-- preservado mesmo após deleção de usuário.
ALTER TABLE public.atividades ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.atividades
  DROP CONSTRAINT IF EXISTS atividades_user_id_fkey;
ALTER TABLE public.atividades
  ADD CONSTRAINT atividades_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- invite_links.criado_por
ALTER TABLE public.invite_links ALTER COLUMN criado_por DROP NOT NULL;
ALTER TABLE public.invite_links
  DROP CONSTRAINT IF EXISTS invite_links_criado_por_fkey;
ALTER TABLE public.invite_links
  ADD CONSTRAINT invite_links_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- poker_sessoes.criado_por
ALTER TABLE public.poker_sessoes ALTER COLUMN criado_por DROP NOT NULL;
ALTER TABLE public.poker_sessoes
  DROP CONSTRAINT IF EXISTS poker_sessoes_criado_por_fkey;
ALTER TABLE public.poker_sessoes
  ADD CONSTRAINT poker_sessoes_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- poker_votos.user_id — aqui faz mais sentido CASCADE (voto é inútil sem autor)
ALTER TABLE public.poker_votos
  DROP CONSTRAINT IF EXISTS poker_votos_user_id_fkey;
ALTER TABLE public.poker_votos
  ADD CONSTRAINT poker_votos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.perfis(id) ON DELETE CASCADE;


-- -----------------------------------------------------------------------------
-- 10. Constraint UNIQUE de PR — trocar por índice parcial (ignora NULL)
-- -----------------------------------------------------------------------------

ALTER TABLE public.cartoes
  DROP CONSTRAINT IF EXISTS cartoes_pr_unique;

DROP INDEX IF EXISTS public.cartoes_pr_unique;

CREATE UNIQUE INDEX IF NOT EXISTS cartoes_pr_unique
  ON public.cartoes (pr_repo_id, pr_numero)
  WHERE pr_numero IS NOT NULL AND pr_repo_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 11. Trigger genérico para `atualizado_em` — hoje as colunas existem mas
--     ninguém toca nelas.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'cartoes',
    'comentarios',
    'perfis',
    'poker_sessoes',
    'quadros',
    'workspaces'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_atualizado_em ON public.%I', t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_set_atualizado_em
         BEFORE UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.tg_set_atualizado_em()',
      t
    );
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 12. Garantir trigger `on_auth_user_created` -> handle_new_user
--     Sem ele, novos usuários não ganham perfil e quebram FKs depois.
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 13. Remover índices redundantes (prefixos cobertos por índices compostos)
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_membros_user;            -- parcial, coberto por idx_membros_user_id
DROP INDEX IF EXISTS public.idx_cartoes_workspace_id;    -- prefixo de idx_cartoes_ws_criado
DROP INDEX IF EXISTS public.idx_quadros_workspace;       -- prefixo de idx_quadros_ws_id
DROP INDEX IF EXISTS public.idx_ws_usuarios_user;        -- prefixo de idx_ws_usuarios_user_ws
DROP INDEX IF EXISTS public.idx_rate_limits_key_window;  -- key já é PK
DROP INDEX IF EXISTS public.idx_cartoes_workspace;       -- sobreposto por idx_cartoes_backlog


COMMIT;


-- =============================================================================
-- [DESTRUTIVO] — Ações que PODEM perder dados. Revise e descomente só se sabe
-- o que está fazendo. Rode em staging antes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Dropar cartoes.etiquetas (text[]) — legado da pré-M2M
-- -----------------------------------------------------------------------------
-- Verifique antes quantos cartões ainda usam:
--   SELECT count(*) FROM public.cartoes
--   WHERE etiquetas IS NOT NULL AND array_length(etiquetas, 1) > 0;
--
-- Se quiser migrar os dados para cartao_etiquetas antes de dropar, faça:
--   INSERT INTO public.cartao_etiquetas (cartao_id, etiqueta_id)
--   SELECT c.id, e.id
--   FROM public.cartoes c
--   CROSS JOIN LATERAL unnest(c.etiquetas) AS nome
--   JOIN public.etiquetas e
--     ON e.workspace_id = c.workspace_id AND e.nome = nome
--   ON CONFLICT DO NOTHING;
--
-- Depois:
-- ALTER TABLE public.cartoes DROP COLUMN IF EXISTS etiquetas;


-- -----------------------------------------------------------------------------
-- B. NOT NULL em colunas que deveriam ter owner
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.quadros     ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE public.atividades  ALTER COLUMN workspace_id SET NOT NULL;


-- -----------------------------------------------------------------------------
-- C. Unificar membros em workspace-only (dropar quadro_id órfão)
-- -----------------------------------------------------------------------------
-- 1) Ver órfãos:
--      SELECT count(*) FROM public.membros
--      WHERE workspace_id IS NULL AND quadro_id IS NOT NULL;
-- 2) Backfill:
--      UPDATE public.membros m
--      SET workspace_id = q.workspace_id
--      FROM public.quadros q
--      WHERE m.quadro_id = q.id AND m.workspace_id IS NULL;
-- 3) Dropar:
--      ALTER TABLE public.membros DROP COLUMN quadro_id;
--      ALTER TABLE public.membros ALTER COLUMN workspace_id SET NOT NULL;
--      ALTER TABLE public.membros DROP CONSTRAINT IF EXISTS membros_has_owner;

-- =============================================================================
-- Fim de 034_audit_remediation.sql
-- =============================================================================
