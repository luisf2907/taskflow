-- ═══════════════════════════════════════════════════════════════════════
-- Taskflow Self-Hosted — Bootstrap SQL
-- ═══════════════════════════════════════════════════════════════════════
-- Gerado a partir do dump do schema de producao em 2026-04-16.
-- Fonte da verdade do schema (as migrations em supabase/migrations/ estao
-- fora de sync por drift historico).
--
-- Executado pelo scripts/bootstrap.sh no primeiro `docker compose up`.
-- Idempotente: CREATE ... IF NOT EXISTS / CREATE OR REPLACE na maioria.
-- Policies usam DROP POLICY IF EXISTS pra reaplicar com seguranca.
--
-- Ordem de execucao:
--   1. Extensions (pgvector obrigatoria pra voice embeddings)
--   2. Schema public (tabelas, RPCs, triggers, policies, indexes)
--   3. Storage buckets (3: wiki, reunioes-audio, anexos)
--   4. Storage policies (RLS em storage.objects)
--
-- Pre-requisitos:
--   - Postgres 15+ com pgvector disponivel
--   - Schema "auth" ja existente (criado pelo GoTrue container antes)
--   - Schema "storage" ja existente (criado pelo storage-api container antes)
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;       -- OBRIGATORIA: voice embeddings
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- util pro GoTrue
-- Opcionais: descomentar se o operador quiser observabilidade de queries
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Schema public (tabelas, RPCs, triggers, policies, indexes)
-- ─────────────────────────────────────────────────────────────────────────




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auto_add_workspace_creator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.workspace_usuarios (workspace_id, user_id, papel)
  VALUES (NEW.id, COALESCE(NEW.criado_por, auth.uid()), 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_workspace_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_sync_membro_from_workspace_usuario"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_perfil RECORD;
  v_avatar_cores TEXT[] := ARRAY[
    '#EF4444','#F97316','#EAB308','#22C55E','#14B8A6',
    '#3B82F6','#6366F1','#A855F7','#EC4899','#78716C'
  ];
  v_cor TEXT;
  v_count INT;
BEGIN
  SELECT id, nome, email, avatar_url
  INTO v_perfil
  FROM public.perfis
  WHERE id = NEW.user_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Se ja existe membro com o mesmo email no workspace (mesmo que de outro
  -- user_id), nao cria duplicata. Cobre o caso de oauth + email/password
  -- criando contas auth.users diferentes para a mesma pessoa.
  IF v_perfil.email IS NOT NULL AND TRIM(v_perfil.email) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.membros
      WHERE workspace_id = NEW.workspace_id
        AND email IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(v_perfil.email))
    ) THEN
      -- Atualiza o user_id do membro existente (pode estar null)
      UPDATE public.membros
      SET user_id = COALESCE(user_id, NEW.user_id),
          nome = COALESCE(v_perfil.nome, nome),
          avatar_url = COALESCE(v_perfil.avatar_url, avatar_url)
      WHERE workspace_id = NEW.workspace_id
        AND email IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(v_perfil.email))
        AND (user_id IS NULL OR user_id = NEW.user_id);
      RETURN NEW;
    END IF;
  END IF;

  -- Se ja existe membro com o mesmo user_id
  IF EXISTS (
    SELECT 1 FROM public.membros
    WHERE workspace_id = NEW.workspace_id
      AND user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Conta membros existentes no workspace pra escolher cor deterministicamente
  SELECT COUNT(*) INTO v_count
  FROM public.membros
  WHERE workspace_id = NEW.workspace_id;

  v_cor := v_avatar_cores[(v_count % array_length(v_avatar_cores, 1)) + 1];

  INSERT INTO public.membros (
    workspace_id,
    nome,
    email,
    cor_avatar,
    avatar_url,
    user_id
  )
  VALUES (
    NEW.workspace_id,
    COALESCE(v_perfil.nome, v_perfil.email, 'Membro'),
    v_perfil.email,
    v_cor,
    v_perfil.avatar_url,
    v_perfil.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_sync_membro_from_workspace_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max_requests" integer, "p_window_seconds" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Tentar buscar entrada existente
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key;

  -- Se n├úo existe ou janela expirou, resetar
  IF NOT FOUND OR v_now > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = v_now;
    RETURN json_build_object('ok', true);
  END IF;

  -- Se excedeu o limite, bloquear
  IF v_count >= p_max_requests THEN
    RETURN json_build_object(
      'ok', false,
      'retryAfter', EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INT
    );
  END IF;

  -- Incrementar contador
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN json_build_object('ok', true);
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max_requests" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_rate_limits"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."cleanup_rate_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_notificacao"("p_user_id" "uuid", "p_titulo" "text", "p_mensagem" "text" DEFAULT NULL::"text", "p_tipo" "text" DEFAULT 'info'::"text", "p_link" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_id     uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Self-notify: sempre permitido.
  -- Cross-user: s├│ se ambos compartilham algum workspace.
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


ALTER FUNCTION "public"."criar_notificacao"("p_user_id" "uuid", "p_titulo" "text", "p_mensagem" "text", "p_tipo" "text", "p_link" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_whoami"() RETURNS json
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;


ALTER FUNCTION "public"."debug_whoami"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_metrics"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH meus_cartoes AS (
    SELECT DISTINCT c.id, c.titulo, c.atualizado_em, c.coluna_id
    FROM cartoes c
    JOIN cartao_membros cm ON cm.cartao_id = c.id
    JOIN membros m ON m.id = cm.membro_id
    WHERE m.user_id = p_user_id
  ),
  com_coluna AS (
    SELECT
      mc.id,
      mc.titulo,
      mc.atualizado_em,
      col.nome AS coluna_nome,
      col.quadro_id
    FROM meus_cartoes mc
    JOIN colunas col ON col.id = mc.coluna_id
    ORDER BY mc.atualizado_em DESC
    LIMIT 8
  ),
  done_today AS (
    SELECT COUNT(*) AS cnt
    FROM meus_cartoes mc
    JOIN colunas col ON col.id = mc.coluna_id
    WHERE mc.atualizado_em::date = CURRENT_DATE
      AND (LOWER(col.nome) LIKE '%conclu%' OR LOWER(col.nome) LIKE '%done%')
  )
  SELECT json_build_object(
    'recentTasks', COALESCE((SELECT json_agg(json_build_object(
      'id', cc.id,
      'titulo', cc.titulo,
      'coluna_nome', cc.coluna_nome,
      'quadro_id', cc.quadro_id,
      'atualizado_em', cc.atualizado_em
    )) FROM com_coluna cc), '[]'::json),
    'tasksDoneToday', (SELECT cnt FROM done_today)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_metrics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sprint_summary"("p_sprint_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
  v_ultima_coluna_id UUID;
BEGIN
  -- Buscar ultima coluna (Done)
  SELECT col.id INTO v_ultima_coluna_id
  FROM colunas col
  WHERE col.quadro_id = p_sprint_id
  ORDER BY col.posicao DESC
  LIMIT 1;

  SELECT json_build_object(
    'colunas', COALESCE((
      SELECT json_agg(json_build_object(
        'id', sub.id,
        'nome', sub.nome,
        'posicao', sub.posicao,
        'cards', sub.card_count,
        'pontos', sub.pontos
      ) ORDER BY sub.posicao)
      FROM (
        SELECT
          col.id,
          col.nome,
          col.posicao,
          COUNT(c.id)::INT AS card_count,
          COALESCE(SUM(c.peso), 0)::INT AS pontos
        FROM colunas col
        LEFT JOIN cartoes c ON c.coluna_id = col.id
        WHERE col.quadro_id = p_sprint_id
        GROUP BY col.id, col.nome, col.posicao
      ) sub
    ), '[]'::json),
    'total_cards', (
      SELECT COUNT(*)::INT FROM cartoes c
      JOIN colunas col ON col.id = c.coluna_id
      WHERE col.quadro_id = p_sprint_id
    ),
    'total_pontos', (
      SELECT COALESCE(SUM(c.peso), 0)::INT FROM cartoes c
      JOIN colunas col ON col.id = c.coluna_id
      WHERE col.quadro_id = p_sprint_id
    ),
    'concluidos', (
      SELECT COUNT(*)::INT FROM cartoes c
      WHERE c.coluna_id = v_ultima_coluna_id
    ),
    'pontos_concluidos', (
      SELECT COALESCE(SUM(c.peso), 0)::INT FROM cartoes c
      WHERE c.coluna_id = v_ultima_coluna_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_sprint_summary"("p_sprint_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("ws_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id
    AND user_id = auth.uid()
    AND papel = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_workspace_admin"("ws_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("ws_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_usuarios
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_workspace_member"("ws_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer DEFAULT 5) RETURNS TABLE("usuario_id" "uuid", "nome" "text", "avatar_url" "text", "similarity" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p.id as usuario_id,
    p.nome,
    p.avatar_url,
    -- cosine similarity = 1 - cosine distance
    (1 - (p.voice_embedding <=> p_embedding))::numeric as similarity
  from public.perfis p
  join public.workspace_usuarios wu on wu.user_id = p.id
  where wu.workspace_id = p_workspace_id
    and p.voice_embedding is not null
    and p.voice_consent_at is not null
  order by p.voice_embedding <=> p_embedding asc
  limit p_limit;
$$;


ALTER FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) IS 'Retorna membros de um workspace ordenados por similaridade de voz contra um embedding. Usado pelo Next.js apos receber o response do worker de voz.';



CREATE OR REPLACE FUNCTION "public"."move_card_complete"("p_cartao_id" "uuid", "p_nova_coluna_id" "uuid", "p_nova_posicao" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_quadro_id UUID;
  v_old_coluna_id UUID;
  v_ultima_coluna_id UUID;
  v_is_done BOOLEAN;
  v_card_titulo TEXT;
  v_workspace_id UUID;
  v_member_ids UUID[];
BEGIN
  -- Buscar info do card atual
  SELECT c.coluna_id, c.titulo, c.workspace_id
  INTO v_old_coluna_id, v_card_titulo, v_workspace_id
  FROM cartoes c
  WHERE c.id = p_cartao_id;

  IF v_old_coluna_id IS NULL THEN
    RETURN json_build_object('error', 'Card nao encontrado');
  END IF;

  -- Buscar quadro_id e ultima coluna
  SELECT col.quadro_id INTO v_quadro_id
  FROM colunas col WHERE col.id = p_nova_coluna_id;

  SELECT col.id INTO v_ultima_coluna_id
  FROM colunas col
  WHERE col.quadro_id = v_quadro_id
  ORDER BY col.posicao DESC
  LIMIT 1;

  v_is_done := (p_nova_coluna_id = v_ultima_coluna_id);

  -- Mover o card
  UPDATE cartoes
  SET coluna_id = p_nova_coluna_id,
      posicao = p_nova_posicao,
      data_conclusao = CASE WHEN v_is_done THEN NOW() ELSE NULL END,
      atualizado_em = NOW()
  WHERE id = p_cartao_id;

  -- Buscar membros do card (para notificacoes)
  SELECT ARRAY_AGG(cm.membro_id)
  INTO v_member_ids
  FROM cartao_membros cm
  WHERE cm.cartao_id = p_cartao_id;

  RETURN json_build_object(
    'ok', true,
    'old_coluna_id', v_old_coluna_id,
    'quadro_id', v_quadro_id,
    'workspace_id', v_workspace_id,
    'is_done', v_is_done,
    'titulo', v_card_titulo,
    'member_ids', COALESCE(v_member_ids, ARRAY[]::UUID[]),
    'ultima_coluna_id', v_ultima_coluna_id
  );
END;
$$;


ALTER FUNCTION "public"."move_card_complete"("p_cartao_id" "uuid", "p_nova_coluna_id" "uuid", "p_nova_posicao" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_workspace_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT workspace_id FROM workspace_usuarios WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."my_workspace_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_invite_link"("p_code" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."redeem_invite_link"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_cards"("p_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_item JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE cartoes
    SET coluna_id = (v_item->>'coluna_id')::UUID,
        posicao = (v_item->>'posicao')::INT,
        atualizado_em = NOW()
    WHERE id = (v_item->>'id')::UUID;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."reorder_cards"("p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_atualizado_em"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_set_atualizado_em"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anexos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "url" "text" NOT NULL,
    "tipo" "text",
    "tamanho" integer,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anexos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key_hash" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "nome" "text" DEFAULT 'API Key'::"text" NOT NULL,
    "ultimo_uso" timestamp with time zone,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."atividades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "quadro_id" "uuid",
    "cartao_id" "uuid",
    "user_id" "uuid",
    "acao" "text" NOT NULL,
    "entidade" "text" NOT NULL,
    "detalhes" "jsonb" DEFAULT '{}'::"jsonb",
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."atividades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automacao_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automacao_id" "uuid" NOT NULL,
    "automacao_nome" "text" NOT NULL,
    "trigger_tipo" "text" NOT NULL,
    "acao_tipo" "text" NOT NULL,
    "cartao_id" "uuid",
    "cartao_titulo" "text",
    "workspace_id" "uuid" NOT NULL,
    "sucesso" boolean DEFAULT true,
    "erro" "text",
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."automacao_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "nome" "text" DEFAULT ''::"text" NOT NULL,
    "trigger_tipo" "text" NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "acao_tipo" "text" NOT NULL,
    "acao_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."automacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cartao_etiquetas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "etiqueta_id" "uuid" NOT NULL
);


ALTER TABLE "public"."cartao_etiquetas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cartao_membros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "membro_id" "uuid" NOT NULL
);


ALTER TABLE "public"."cartao_membros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cartoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coluna_id" "uuid",
    "workspace_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "posicao" integer DEFAULT 0 NOT NULL,
    "data_entrega" timestamp with time zone,
    "peso" integer,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "pr_numero" integer,
    "pr_url" "text",
    "pr_status" "text",
    "pr_repo_id" "uuid",
    "pr_autor" "text",
    "pr_historico" "jsonb" DEFAULT '[]'::"jsonb",
    "branch" "text",
    "branch_repo_id" "uuid",
    "data_conclusao" timestamp with time zone,
    CONSTRAINT "cartoes_pr_status_check" CHECK ((("pr_status" IS NULL) OR ("pr_status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'merged'::"text"]))))
);


ALTER TABLE "public"."cartoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "concluido" boolean DEFAULT false,
    "posicao" integer DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."checklist_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "titulo" "text" DEFAULT 'Checklist'::"text" NOT NULL,
    "posicao" integer DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colunas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quadro_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "posicao" integer DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."colunas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comentarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "membro_id" "uuid",
    "texto" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comentarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etiquetas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quadro_id" "uuid",
    "workspace_id" "uuid",
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "etiquetas_has_owner" CHECK ((("quadro_id" IS NOT NULL) OR ("workspace_id" IS NOT NULL)))
);


ALTER TABLE "public"."etiquetas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."github_tokens" (
    "user_id" "uuid" NOT NULL,
    "provider_token" "text" NOT NULL,
    "provider_refresh_token" "text",
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "encrypted_token" "text"
);


ALTER TABLE "public"."github_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invite_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "criado_por" "uuid",
    "expira_em" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invite_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text",
    "cor_avatar" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "avatar_url" "text"
);


ALTER TABLE "public"."membros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notificacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text",
    "tipo" "text" DEFAULT 'info'::"text",
    "lida" boolean DEFAULT false,
    "link" "text",
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notificacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfis" (
    "id" "uuid" NOT NULL,
    "nome" "text",
    "email" "text",
    "avatar_url" "text",
    "github_username" "text",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "notif_preferences" "jsonb" DEFAULT '{"inapp_todas": true, "email_convite": true, "email_card_atribuido": true, "email_digest_semanal": false}'::"jsonb",
    "onboarding_done" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 0,
    "voice_embedding" "public"."vector"(256),
    "voice_enrolled_at" timestamp with time zone,
    "voice_consent_at" timestamp with time zone,
    "theme_preferences" "jsonb"
);


ALTER TABLE "public"."perfis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poker_sessoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "cartao_id" "uuid" NOT NULL,
    "criado_por" "uuid",
    "status" "text" DEFAULT 'votando'::"text" NOT NULL,
    "resultado_final" numeric,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "poker_sessoes_status_check" CHECK (("status" = ANY (ARRAY['votando'::"text", 'revelado'::"text", 'finalizado'::"text"])))
);


ALTER TABLE "public"."poker_sessoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poker_votos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sessao_id" "uuid" NOT NULL,
    "membro_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "valor" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."poker_votos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quadros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#3B82F6'::"text",
    "workspace_id" "uuid" NOT NULL,
    "data_inicio" "date",
    "data_fim" "date",
    "status_sprint" "text" DEFAULT 'planejada'::"text",
    "meta" "text",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quadros_status_sprint_check" CHECK (("status_sprint" = ANY (ARRAY['planejada'::"text", 'ativa'::"text", 'concluida'::"text"])))
);


ALTER TABLE "public"."quadros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repositorios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "owner" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "webhook_secret" "text",
    "coluna_review_id" "uuid",
    "coluna_done_id" "uuid",
    "coluna_doing_id" "uuid"
);


ALTER TABLE "public"."repositorios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reuniao_falas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reuniao_id" "uuid" NOT NULL,
    "ordem" integer NOT NULL,
    "inicio_ms" integer NOT NULL,
    "fim_ms" integer NOT NULL,
    "speaker_label" "text" NOT NULL,
    "usuario_id" "uuid",
    "match_confianca" numeric,
    "match_tipo" "text",
    "texto" "text" NOT NULL,
    CONSTRAINT "reuniao_falas_match_tipo_check" CHECK ((("match_tipo" IS NULL) OR ("match_tipo" = ANY (ARRAY['strong'::"text", 'weak'::"text", 'none'::"text", 'manual'::"text"]))))
);


ALTER TABLE "public"."reuniao_falas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reunioes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "audio_path" "text",
    "audio_size_bytes" bigint,
    "audio_mime" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "erro_mensagem" "text",
    "duracao_seg" numeric,
    "language" "text",
    "language_probability" numeric,
    "timings_ms" "jsonb",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processado_em" timestamp with time zone,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resumo_ia" "jsonb",
    CONSTRAINT "reunioes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'done'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."reunioes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sprint_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "sprint_origem" "uuid" NOT NULL,
    "sprint_destino" "uuid" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sprint_dependencies_check" CHECK (("sprint_origem" <> "sprint_destino"))
);


ALTER TABLE "public"."sprint_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wiki_paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "titulo" "text" DEFAULT 'Sem t├¡tulo'::"text" NOT NULL,
    "slug" "text" NOT NULL,
    "icone" "text",
    "capa_url" "text",
    "conteudo" "jsonb",
    "posicao" integer DEFAULT 0 NOT NULL,
    "criado_por" "uuid" NOT NULL,
    "atualizado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wiki_paginas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "papel" "text" DEFAULT 'membro'::"text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_usuarios_papel_check" CHECK (("papel" = ANY (ARRAY['admin'::"text", 'membro'::"text"])))
);


ALTER TABLE "public"."workspace_usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "cor" "text" DEFAULT '#C4841D'::"text" NOT NULL,
    "icone" "text" DEFAULT 'folder'::"text",
    "colunas_padrao" "text"[] DEFAULT '{"A Fazer","Em Andamento","Em Revis├úo",Conclu├¡do}'::"text"[],
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "criado_por" "uuid"
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."atividades"
    ADD CONSTRAINT "atividades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automacao_logs"
    ADD CONSTRAINT "automacao_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automacoes"
    ADD CONSTRAINT "automacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cartao_etiquetas"
    ADD CONSTRAINT "cartao_etiquetas_cartao_id_etiqueta_id_key" UNIQUE ("cartao_id", "etiqueta_id");



ALTER TABLE ONLY "public"."cartao_etiquetas"
    ADD CONSTRAINT "cartao_etiquetas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cartao_membros"
    ADD CONSTRAINT "cartao_membros_cartao_id_membro_id_key" UNIQUE ("cartao_id", "membro_id");



ALTER TABLE ONLY "public"."cartao_membros"
    ADD CONSTRAINT "cartao_membros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cartoes"
    ADD CONSTRAINT "cartoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_itens"
    ADD CONSTRAINT "checklist_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colunas"
    ADD CONSTRAINT "colunas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comentarios"
    ADD CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."github_tokens"
    ADD CONSTRAINT "github_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membros"
    ADD CONSTRAINT "membros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membros"
    ADD CONSTRAINT "membros_workspace_user_unique" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poker_sessoes"
    ADD CONSTRAINT "poker_sessoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poker_votos"
    ADD CONSTRAINT "poker_votos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poker_votos"
    ADD CONSTRAINT "poker_votos_sessao_id_user_id_key" UNIQUE ("sessao_id", "user_id");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_workspace_id_owner_nome_key" UNIQUE ("workspace_id", "owner", "nome");



ALTER TABLE ONLY "public"."reuniao_falas"
    ADD CONSTRAINT "reuniao_falas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reunioes"
    ADD CONSTRAINT "reunioes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sprint_dependencies"
    ADD CONSTRAINT "sprint_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sprint_dependencies"
    ADD CONSTRAINT "sprint_dependencies_sprint_origem_sprint_destino_key" UNIQUE ("sprint_origem", "sprint_destino");



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_workspace_id_slug_key" UNIQUE ("workspace_id", "slug");



ALTER TABLE ONLY "public"."workspace_usuarios"
    ADD CONSTRAINT "workspace_usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_usuarios"
    ADD CONSTRAINT "workspace_usuarios_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "cartoes_pr_unique" ON "public"."cartoes" USING "btree" ("pr_repo_id", "pr_numero") WHERE (("pr_numero" IS NOT NULL) AND ("pr_repo_id" IS NOT NULL));



CREATE INDEX "idx_anexos_cartao" ON "public"."anexos" USING "btree" ("cartao_id");



CREATE INDEX "idx_api_keys_hash" ON "public"."api_keys" USING "btree" ("key_hash");



CREATE INDEX "idx_api_keys_user" ON "public"."api_keys" USING "btree" ("user_id");



CREATE INDEX "idx_atividades_cartao" ON "public"."atividades" USING "btree" ("cartao_id", "criado_em" DESC) WHERE ("cartao_id" IS NOT NULL);



CREATE INDEX "idx_atividades_detalhes_gin" ON "public"."atividades" USING "gin" ("detalhes");



CREATE INDEX "idx_atividades_quadro" ON "public"."atividades" USING "btree" ("quadro_id", "criado_em" DESC);



CREATE INDEX "idx_atividades_user" ON "public"."atividades" USING "btree" ("user_id");



CREATE INDEX "idx_atividades_workspace" ON "public"."atividades" USING "btree" ("workspace_id", "criado_em" DESC);



CREATE INDEX "idx_automacao_logs_automacao" ON "public"."automacao_logs" USING "btree" ("automacao_id", "criado_em" DESC);



CREATE INDEX "idx_automacao_logs_workspace" ON "public"."automacao_logs" USING "btree" ("workspace_id", "criado_em" DESC);



CREATE INDEX "idx_automacoes_workspace" ON "public"."automacoes" USING "btree" ("workspace_id");



CREATE INDEX "idx_cartao_etiquetas_cartao" ON "public"."cartao_etiquetas" USING "btree" ("cartao_id");



CREATE INDEX "idx_cartao_etiquetas_etiqueta" ON "public"."cartao_etiquetas" USING "btree" ("etiqueta_id");



CREATE INDEX "idx_cartao_membros_cartao" ON "public"."cartao_membros" USING "btree" ("cartao_id");



CREATE INDEX "idx_cartao_membros_membro" ON "public"."cartao_membros" USING "btree" ("membro_id");



CREATE INDEX "idx_cartoes_backlog" ON "public"."cartoes" USING "btree" ("coluna_id") WHERE ("coluna_id" IS NULL);



CREATE INDEX "idx_cartoes_coluna" ON "public"."cartoes" USING "btree" ("coluna_id");



CREATE INDEX "idx_cartoes_data_entrega" ON "public"."cartoes" USING "btree" ("data_entrega") WHERE ("data_entrega" IS NOT NULL);



CREATE INDEX "idx_cartoes_id_ws" ON "public"."cartoes" USING "btree" ("id", "workspace_id");



CREATE INDEX "idx_cartoes_posicao" ON "public"."cartoes" USING "btree" ("coluna_id", "posicao");



CREATE INDEX "idx_cartoes_pr" ON "public"."cartoes" USING "btree" ("pr_repo_id", "pr_numero") WHERE ("pr_numero" IS NOT NULL);



CREATE INDEX "idx_cartoes_pr_historico_gin" ON "public"."cartoes" USING "gin" ("pr_historico");



CREATE INDEX "idx_cartoes_ws_criado" ON "public"."cartoes" USING "btree" ("workspace_id", "criado_em" DESC);



CREATE INDEX "idx_checklist_itens_checklist" ON "public"."checklist_itens" USING "btree" ("checklist_id");



CREATE INDEX "idx_checklists_cartao" ON "public"."checklists" USING "btree" ("cartao_id");



CREATE INDEX "idx_checklists_id_cartao" ON "public"."checklists" USING "btree" ("id", "cartao_id");



CREATE INDEX "idx_colunas_posicao" ON "public"."colunas" USING "btree" ("quadro_id", "posicao");



CREATE INDEX "idx_colunas_quadro" ON "public"."colunas" USING "btree" ("quadro_id");



CREATE INDEX "idx_comentarios_cartao" ON "public"."comentarios" USING "btree" ("cartao_id");



CREATE INDEX "idx_comentarios_cartao_ordenado" ON "public"."comentarios" USING "btree" ("cartao_id", "criado_em" DESC);



CREATE INDEX "idx_etiquetas_quadro" ON "public"."etiquetas" USING "btree" ("quadro_id");



CREATE INDEX "idx_etiquetas_workspace" ON "public"."etiquetas" USING "btree" ("workspace_id") WHERE ("workspace_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_etiquetas_workspace_nome" ON "public"."etiquetas" USING "btree" ("workspace_id", "nome") WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_invite_links_code" ON "public"."invite_links" USING "btree" ("code");



CREATE INDEX "idx_invite_links_workspace" ON "public"."invite_links" USING "btree" ("workspace_id");



CREATE INDEX "idx_membros_user_id" ON "public"."membros" USING "btree" ("user_id");



CREATE INDEX "idx_membros_workspace" ON "public"."membros" USING "btree" ("workspace_id") WHERE ("workspace_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_membros_workspace_email_unique" ON "public"."membros" USING "btree" ("workspace_id", "lower"(TRIM(BOTH FROM "email"))) WHERE (("email" IS NOT NULL) AND (TRIM(BOTH FROM "email") <> ''::"text"));



CREATE INDEX "idx_notificacoes_lida" ON "public"."notificacoes" USING "btree" ("user_id", "lida");



CREATE INDEX "idx_notificacoes_user" ON "public"."notificacoes" USING "btree" ("user_id", "criado_em" DESC);



CREATE UNIQUE INDEX "idx_poker_sessao_ativa_por_cartao" ON "public"."poker_sessoes" USING "btree" ("cartao_id") WHERE ("status" <> 'finalizado'::"text");



CREATE INDEX "idx_poker_sessoes_id_ws" ON "public"."poker_sessoes" USING "btree" ("id", "workspace_id");



CREATE INDEX "idx_poker_sessoes_workspace" ON "public"."poker_sessoes" USING "btree" ("workspace_id", "criado_em" DESC);



CREATE INDEX "idx_poker_votos_sessao" ON "public"."poker_votos" USING "btree" ("sessao_id");



CREATE INDEX "idx_quadros_data_fim" ON "public"."quadros" USING "btree" ("data_fim") WHERE ("data_fim" IS NOT NULL);



CREATE INDEX "idx_quadros_status_sprint" ON "public"."quadros" USING "btree" ("status_sprint") WHERE ("workspace_id" IS NOT NULL);



CREATE INDEX "idx_quadros_ws_id" ON "public"."quadros" USING "btree" ("workspace_id", "id");



CREATE INDEX "idx_rate_limits_window" ON "public"."rate_limits" USING "btree" ("window_start");



CREATE INDEX "idx_repositorios_workspace" ON "public"."repositorios" USING "btree" ("workspace_id");



CREATE INDEX "idx_reuniao_falas_reuniao" ON "public"."reuniao_falas" USING "btree" ("reuniao_id", "ordem");



CREATE INDEX "idx_reuniao_falas_usuario" ON "public"."reuniao_falas" USING "btree" ("usuario_id") WHERE ("usuario_id" IS NOT NULL);



CREATE INDEX "idx_reunioes_status" ON "public"."reunioes" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_reunioes_workspace" ON "public"."reunioes" USING "btree" ("workspace_id", "criado_em" DESC);



CREATE INDEX "idx_sprint_deps_destino" ON "public"."sprint_dependencies" USING "btree" ("sprint_destino");



CREATE INDEX "idx_sprint_deps_origem" ON "public"."sprint_dependencies" USING "btree" ("sprint_origem");



CREATE INDEX "idx_sprint_deps_workspace" ON "public"."sprint_dependencies" USING "btree" ("workspace_id");



CREATE INDEX "idx_wiki_paginas_parent" ON "public"."wiki_paginas" USING "btree" ("workspace_id", "parent_id", "posicao");



CREATE INDEX "idx_wiki_paginas_slug" ON "public"."wiki_paginas" USING "btree" ("workspace_id", "slug");



CREATE INDEX "idx_wiki_paginas_workspace" ON "public"."wiki_paginas" USING "btree" ("workspace_id");



CREATE INDEX "idx_workspaces_criado" ON "public"."workspaces" USING "btree" ("criado_em");



CREATE INDEX "idx_ws_usuarios_user_ws" ON "public"."workspace_usuarios" USING "btree" ("user_id", "workspace_id");



CREATE INDEX "idx_ws_usuarios_workspace" ON "public"."workspace_usuarios" USING "btree" ("workspace_id");



CREATE INDEX "perfis_voice_embedding_hnsw" ON "public"."perfis" USING "hnsw" ("voice_embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE OR REPLACE TRIGGER "trg_auto_add_workspace_creator" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_workspace_creator"();



CREATE OR REPLACE TRIGGER "trg_auto_sync_membro" AFTER INSERT ON "public"."workspace_usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."auto_sync_membro_from_workspace_usuario"();



CREATE OR REPLACE TRIGGER "trg_reunioes_atualizado_em" BEFORE UPDATE ON "public"."reunioes" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."cartoes" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."comentarios" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."perfis" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."poker_sessoes" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."quadros" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_set_atualizado_em" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_atualizado_em"();



ALTER TABLE ONLY "public"."anexos"
    ADD CONSTRAINT "anexos_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."perfis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."atividades"
    ADD CONSTRAINT "atividades_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."atividades"
    ADD CONSTRAINT "atividades_quadro_id_fkey" FOREIGN KEY ("quadro_id") REFERENCES "public"."quadros"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."atividades"
    ADD CONSTRAINT "atividades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."perfis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."atividades"
    ADD CONSTRAINT "atividades_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automacao_logs"
    ADD CONSTRAINT "automacao_logs_automacao_id_fkey" FOREIGN KEY ("automacao_id") REFERENCES "public"."automacoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automacao_logs"
    ADD CONSTRAINT "automacao_logs_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automacao_logs"
    ADD CONSTRAINT "automacao_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automacoes"
    ADD CONSTRAINT "automacoes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartao_etiquetas"
    ADD CONSTRAINT "cartao_etiquetas_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartao_etiquetas"
    ADD CONSTRAINT "cartao_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiquetas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartao_membros"
    ADD CONSTRAINT "cartao_membros_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartao_membros"
    ADD CONSTRAINT "cartao_membros_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "public"."membros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartoes"
    ADD CONSTRAINT "cartoes_branch_repo_id_fkey" FOREIGN KEY ("branch_repo_id") REFERENCES "public"."repositorios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cartoes"
    ADD CONSTRAINT "cartoes_coluna_id_fkey" FOREIGN KEY ("coluna_id") REFERENCES "public"."colunas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cartoes"
    ADD CONSTRAINT "cartoes_pr_repo_id_fkey" FOREIGN KEY ("pr_repo_id") REFERENCES "public"."repositorios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cartoes"
    ADD CONSTRAINT "cartoes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_itens"
    ADD CONSTRAINT "checklist_itens_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."colunas"
    ADD CONSTRAINT "colunas_quadro_id_fkey" FOREIGN KEY ("quadro_id") REFERENCES "public"."quadros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comentarios"
    ADD CONSTRAINT "comentarios_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comentarios"
    ADD CONSTRAINT "comentarios_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "public"."membros"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_quadro_id_fkey" FOREIGN KEY ("quadro_id") REFERENCES "public"."quadros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."github_tokens"
    ADD CONSTRAINT "github_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invite_links"
    ADD CONSTRAINT "invite_links_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membros"
    ADD CONSTRAINT "membros_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membros"
    ADD CONSTRAINT "membros_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificacoes"
    ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."perfis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poker_sessoes"
    ADD CONSTRAINT "poker_sessoes_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "public"."cartoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poker_sessoes"
    ADD CONSTRAINT "poker_sessoes_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."poker_sessoes"
    ADD CONSTRAINT "poker_sessoes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poker_votos"
    ADD CONSTRAINT "poker_votos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "public"."membros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poker_votos"
    ADD CONSTRAINT "poker_votos_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "public"."poker_sessoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poker_votos"
    ADD CONSTRAINT "poker_votos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."perfis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_coluna_doing_id_fkey" FOREIGN KEY ("coluna_doing_id") REFERENCES "public"."colunas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_coluna_done_id_fkey" FOREIGN KEY ("coluna_done_id") REFERENCES "public"."colunas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_coluna_review_id_fkey" FOREIGN KEY ("coluna_review_id") REFERENCES "public"."colunas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repositorios"
    ADD CONSTRAINT "repositorios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reuniao_falas"
    ADD CONSTRAINT "reuniao_falas_reuniao_id_fkey" FOREIGN KEY ("reuniao_id") REFERENCES "public"."reunioes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reuniao_falas"
    ADD CONSTRAINT "reuniao_falas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reunioes"
    ADD CONSTRAINT "reunioes_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reunioes"
    ADD CONSTRAINT "reunioes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sprint_dependencies"
    ADD CONSTRAINT "sprint_dependencies_sprint_destino_fkey" FOREIGN KEY ("sprint_destino") REFERENCES "public"."quadros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sprint_dependencies"
    ADD CONSTRAINT "sprint_dependencies_sprint_origem_fkey" FOREIGN KEY ("sprint_origem") REFERENCES "public"."quadros"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sprint_dependencies"
    ADD CONSTRAINT "sprint_dependencies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_atualizado_por_fkey" FOREIGN KEY ("atualizado_por") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."wiki_paginas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wiki_paginas"
    ADD CONSTRAINT "wiki_paginas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_usuarios"
    ADD CONSTRAINT "workspace_usuarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_usuarios"
    ADD CONSTRAINT "workspace_usuarios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."anexos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anexos_all" ON "public"."anexos" USING ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "anexos"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "anexos"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_keys_delete" ON "public"."api_keys" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "api_keys_insert" ON "public"."api_keys" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "api_keys_select" ON "public"."api_keys" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."atividades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "atividades_insert" ON "public"."atividades" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "atividades_select" ON "public"."atividades" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."automacao_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automacao_logs_insert" ON "public"."automacao_logs" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "automacao_logs_select" ON "public"."automacao_logs" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."automacoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automacoes_delete" ON "public"."automacoes" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "automacoes_insert" ON "public"."automacoes" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "automacoes_select" ON "public"."automacoes" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "automacoes_update" ON "public"."automacoes" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."cartao_etiquetas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cartao_etiquetas_all" ON "public"."cartao_etiquetas" USING ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "cartao_etiquetas"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "cartao_etiquetas"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."cartao_membros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cartao_membros_all" ON "public"."cartao_membros" USING ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "cartao_membros"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "cartao_membros"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."cartoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cartoes_delete" ON "public"."cartoes" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "cartoes_insert" ON "public"."cartoes" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "cartoes_select" ON "public"."cartoes" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "cartoes_update" ON "public"."cartoes" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."checklist_itens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_itens_all" ON "public"."checklist_itens" USING ((EXISTS ( SELECT 1
   FROM ("public"."checklists" "cl"
     JOIN "public"."cartoes" "c" ON (("c"."id" = "cl"."cartao_id")))
  WHERE (("cl"."id" = "checklist_itens"."checklist_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."checklists" "cl"
     JOIN "public"."cartoes" "c" ON (("c"."id" = "cl"."cartao_id")))
  WHERE (("cl"."id" = "checklist_itens"."checklist_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."checklists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklists_all" ON "public"."checklists" USING ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "checklists"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "checklists"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."colunas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "colunas_delete" ON "public"."colunas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."quadros" "q"
  WHERE (("q"."id" = "colunas"."quadro_id") AND ("q"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "colunas_insert" ON "public"."colunas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quadros" "q"
  WHERE (("q"."id" = "colunas"."quadro_id") AND ("q"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "colunas_select" ON "public"."colunas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quadros" "q"
  WHERE (("q"."id" = "colunas"."quadro_id") AND ("q"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "colunas_update" ON "public"."colunas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."quadros" "q"
  WHERE (("q"."id" = "colunas"."quadro_id") AND ("q"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quadros" "q"
  WHERE (("q"."id" = "colunas"."quadro_id") AND ("q"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."comentarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comentarios_all" ON "public"."comentarios" USING ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "comentarios"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
  WHERE (("c"."id" = "comentarios"."cartao_id") AND ("c"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "deps_delete" ON "public"."sprint_dependencies" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "deps_insert" ON "public"."sprint_dependencies" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "deps_select" ON "public"."sprint_dependencies" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."etiquetas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "etiquetas_all" ON "public"."etiquetas" USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."github_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invite_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invite_links_delete" ON "public"."invite_links" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "invite_links_insert" ON "public"."invite_links" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "invite_links_select" ON "public"."invite_links" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "invite_links_update" ON "public"."invite_links" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."membros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membros_all" ON "public"."membros" USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."notificacoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notificacoes_delete" ON "public"."notificacoes" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notificacoes_insert" ON "public"."notificacoes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notificacoes_select" ON "public"."notificacoes" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notificacoes_update" ON "public"."notificacoes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."perfis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfis_insert" ON "public"."perfis" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "perfis_select" ON "public"."perfis" FOR SELECT USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."workspace_usuarios" "wu1"
     JOIN "public"."workspace_usuarios" "wu2" ON (("wu1"."workspace_id" = "wu2"."workspace_id")))
  WHERE (("wu1"."user_id" = "auth"."uid"()) AND ("wu2"."user_id" = "perfis"."id"))))));



CREATE POLICY "perfis_update" ON "public"."perfis" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."poker_sessoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "poker_sessoes_delete" ON "public"."poker_sessoes" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "poker_sessoes_insert" ON "public"."poker_sessoes" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "poker_sessoes_select" ON "public"."poker_sessoes" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "poker_sessoes_update" ON "public"."poker_sessoes" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."poker_votos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "poker_votos_delete" ON "public"."poker_votos" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."poker_sessoes" "ps"
  WHERE (("ps"."id" = "poker_votos"."sessao_id") AND ("ps"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))));



CREATE POLICY "poker_votos_insert" ON "public"."poker_votos" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "poker_votos_select" ON "public"."poker_votos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."poker_sessoes" "ps"
  WHERE (("ps"."id" = "poker_votos"."sessao_id") AND ("ps"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "poker_votos_update" ON "public"."poker_votos" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."quadros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quadros_delete" ON "public"."quadros" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "quadros_insert" ON "public"."quadros" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "quadros_select" ON "public"."quadros" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "quadros_update" ON "public"."quadros" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limits_no_access" ON "public"."rate_limits" USING (false);



ALTER TABLE "public"."repositorios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repositorios_all" ON "public"."repositorios" USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."reuniao_falas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reuniao_falas_delete" ON "public"."reuniao_falas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."id" = "reuniao_falas"."reuniao_id") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "reuniao_falas_insert" ON "public"."reuniao_falas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."id" = "reuniao_falas"."reuniao_id") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "reuniao_falas_select" ON "public"."reuniao_falas" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."id" = "reuniao_falas"."reuniao_id") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



CREATE POLICY "reuniao_falas_update" ON "public"."reuniao_falas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."id" = "reuniao_falas"."reuniao_id") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))))));



ALTER TABLE "public"."reunioes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reunioes_delete" ON "public"."reunioes" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "reunioes_insert" ON "public"."reunioes" FOR INSERT WITH CHECK ((("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")) AND ("criado_por" = "auth"."uid"())));



CREATE POLICY "reunioes_select" ON "public"."reunioes" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "reunioes_update" ON "public"."reunioes" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))) WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."sprint_dependencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tokens_no_access" ON "public"."github_tokens" USING (false);



ALTER TABLE "public"."wiki_paginas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wiki_paginas_delete" ON "public"."wiki_paginas" FOR DELETE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "wiki_paginas_insert" ON "public"."wiki_paginas" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "wiki_paginas_select" ON "public"."wiki_paginas" FOR SELECT USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



CREATE POLICY "wiki_paginas_update" ON "public"."wiki_paginas" FOR UPDATE USING (("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")));



ALTER TABLE "public"."workspace_usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspaces_delete" ON "public"."workspaces" FOR DELETE USING ("public"."is_workspace_admin"("id"));



CREATE POLICY "workspaces_insert" ON "public"."workspaces" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "workspaces_select" ON "public"."workspaces" FOR SELECT USING ((("criado_por" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))));



CREATE POLICY "workspaces_update" ON "public"."workspaces" FOR UPDATE USING ("public"."is_workspace_admin"("id")) WITH CHECK ("public"."is_workspace_admin"("id"));



CREATE POLICY "ws_usuarios_delete" ON "public"."workspace_usuarios" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."is_workspace_admin"("workspace_id")));



CREATE POLICY "ws_usuarios_insert" ON "public"."workspace_usuarios" FOR INSERT WITH CHECK ("public"."is_workspace_admin"("workspace_id"));



CREATE POLICY "ws_usuarios_select" ON "public"."workspace_usuarios" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids"))));



CREATE POLICY "ws_usuarios_update" ON "public"."workspace_usuarios" FOR UPDATE USING ("public"."is_workspace_admin"("workspace_id")) WITH CHECK ("public"."is_workspace_admin"("workspace_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_workspace_creator"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_workspace_creator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_workspace_creator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_sync_membro_from_workspace_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_sync_membro_from_workspace_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_sync_membro_from_workspace_usuario"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."criar_notificacao"("p_user_id" "uuid", "p_titulo" "text", "p_mensagem" "text", "p_tipo" "text", "p_link" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."criar_notificacao"("p_user_id" "uuid", "p_titulo" "text", "p_mensagem" "text", "p_tipo" "text", "p_link" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_notificacao"("p_user_id" "uuid", "p_titulo" "text", "p_mensagem" "text", "p_tipo" "text", "p_link" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_whoami"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sprint_summary"("p_sprint_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sprint_summary"("p_sprint_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sprint_summary"("p_sprint_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("ws_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("ws_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("ws_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("ws_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_voice_profiles"("p_workspace_id" "uuid", "p_embedding" "public"."vector", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."move_card_complete"("p_cartao_id" "uuid", "p_nova_coluna_id" "uuid", "p_nova_posicao" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."move_card_complete"("p_cartao_id" "uuid", "p_nova_coluna_id" "uuid", "p_nova_posicao" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_card_complete"("p_cartao_id" "uuid", "p_nova_coluna_id" "uuid", "p_nova_posicao" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."my_workspace_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_workspace_ids"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_invite_link"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_invite_link"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_invite_link"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_cards"("p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_cards"("p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_cards"("p_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_atualizado_em"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_atualizado_em"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_atualizado_em"() TO "service_role";



GRANT ALL ON TABLE "public"."anexos" TO "authenticated";
GRANT ALL ON TABLE "public"."anexos" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."atividades" TO "authenticated";
GRANT ALL ON TABLE "public"."atividades" TO "service_role";



GRANT ALL ON TABLE "public"."automacao_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."automacao_logs" TO "service_role";



GRANT ALL ON TABLE "public"."automacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."automacoes" TO "service_role";



GRANT ALL ON TABLE "public"."cartao_etiquetas" TO "authenticated";
GRANT ALL ON TABLE "public"."cartao_etiquetas" TO "service_role";



GRANT ALL ON TABLE "public"."cartao_membros" TO "authenticated";
GRANT ALL ON TABLE "public"."cartao_membros" TO "service_role";



GRANT ALL ON TABLE "public"."cartoes" TO "authenticated";
GRANT ALL ON TABLE "public"."cartoes" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_itens" TO "service_role";



GRANT ALL ON TABLE "public"."checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."checklists" TO "service_role";



GRANT ALL ON TABLE "public"."colunas" TO "authenticated";
GRANT ALL ON TABLE "public"."colunas" TO "service_role";



GRANT ALL ON TABLE "public"."comentarios" TO "authenticated";
GRANT ALL ON TABLE "public"."comentarios" TO "service_role";



GRANT ALL ON TABLE "public"."etiquetas" TO "authenticated";
GRANT ALL ON TABLE "public"."etiquetas" TO "service_role";



GRANT ALL ON TABLE "public"."github_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."github_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."invite_links" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_links" TO "service_role";



GRANT ALL ON TABLE "public"."membros" TO "authenticated";
GRANT ALL ON TABLE "public"."membros" TO "service_role";



GRANT ALL ON TABLE "public"."notificacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."notificacoes" TO "service_role";



GRANT ALL ON TABLE "public"."perfis" TO "authenticated";
GRANT ALL ON TABLE "public"."perfis" TO "service_role";



GRANT ALL ON TABLE "public"."poker_sessoes" TO "authenticated";
GRANT ALL ON TABLE "public"."poker_sessoes" TO "service_role";



GRANT ALL ON TABLE "public"."poker_votos" TO "authenticated";
GRANT ALL ON TABLE "public"."poker_votos" TO "service_role";



GRANT ALL ON TABLE "public"."quadros" TO "authenticated";
GRANT ALL ON TABLE "public"."quadros" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."repositorios" TO "authenticated";
GRANT ALL ON TABLE "public"."repositorios" TO "service_role";



GRANT ALL ON TABLE "public"."reuniao_falas" TO "anon";
GRANT ALL ON TABLE "public"."reuniao_falas" TO "authenticated";
GRANT ALL ON TABLE "public"."reuniao_falas" TO "service_role";



GRANT ALL ON TABLE "public"."reunioes" TO "anon";
GRANT ALL ON TABLE "public"."reunioes" TO "authenticated";
GRANT ALL ON TABLE "public"."reunioes" TO "service_role";



GRANT ALL ON TABLE "public"."sprint_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."sprint_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."wiki_paginas" TO "anon";
GRANT ALL ON TABLE "public"."wiki_paginas" TO "authenticated";
GRANT ALL ON TABLE "public"."wiki_paginas" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- ─────────────────────────────────────────────────────────────────────────
-- 3. Storage buckets (3 buckets configurados em producao)
-- ─────────────────────────────────────────────────────────────────────────
-- IF NOT EXISTS via ON CONFLICT: re-execucao e segura, nao sobrescreve
-- buckets existentes com dados.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('wiki',           'wiki',           true,  5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('reunioes-audio', 'reunioes-audio', false, 52428800, ARRAY['audio/*','video/*']),
  ('anexos',         'anexos',         true,  52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Storage policies — RLS em storage.objects
-- ─────────────────────────────────────────────────────────────────────────
-- NOTA: bucket "anexos" nao tem policies em producao (falha de seguranca
-- conhecida). Replicada aqui ate ser corrigida em PR separado.

DROP POLICY IF EXISTS "wiki_select_publico" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_upload_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_update_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_delete_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_select" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_insert" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_delete" ON "storage"."objects";

CREATE POLICY "reunioes_audio_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'reunioes-audio'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."audio_path" = "objects"."name") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))));
CREATE POLICY "reunioes_audio_insert" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'reunioes-audio'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "reunioes_audio_select" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'reunioes-audio'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."audio_path" = "objects"."name") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))));
CREATE POLICY "wiki_delete_membros" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));
CREATE POLICY "wiki_select_publico" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'wiki'::"text"));
CREATE POLICY "wiki_update_membros" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));
CREATE POLICY "wiki_upload_membros" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));



-- ─────────────────────────────────────────────────────────────────────────
-- 5. Realtime triggers (pg_notify pro driver pg-notify-sse)
-- ─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════
-- Realtime triggers — pg_notify pra SSE driver
-- ═══════════════════════════════════════════════════════════════════════
-- Emite eventos no canal `realtime_events` quando tabelas monitoradas
-- mudam. O SSE endpoint /api/realtime/* do Next.js mantem conexao
-- LISTEN realtime_events e repassa pro browser filtrado por escopo.
--
-- Canal unico (em vez de 1 por tabela) simplifica: 1 LISTEN cobre tudo,
-- o Next filtra no nivel da API route baseado em autorizacao do user.
--
-- Payload JSON (exemplo):
--   {
--     "table": "cartoes",
--     "op": "UPDATE",
--     "id": "card-uuid",
--     "workspace_id": "ws-uuid",
--     "quadro_id": "q-uuid",
--     "coluna_id": "col-uuid"   -- opcional, so pra cartoes/comentarios
--   }
--
-- Aplicado quando STORAGE_DRIVER=local-disk OU quando operador quer
-- substituir o Supabase Realtime container por SSE leve. Se o
-- container Realtime estiver rodando (perfil full), pode-se pular
-- este script — ambos podem coexistir, mas e redundante.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- Funcao generica: pega o row (NEW em INSERT/UPDATE, OLD em DELETE),
-- extrai os ids relevantes e faz pg_notify.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_realtime_notify() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    payload jsonb;
    row_data record;
BEGIN
    -- Pega o row correto baseado na operacao
    IF TG_OP = 'DELETE' THEN
        row_data := OLD;
    ELSE
        row_data := NEW;
    END IF;

    -- Monta payload base
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', row_data.id
    );

    -- Adiciona ids de escopo dependendo da tabela
    CASE TG_TABLE_NAME
        WHEN 'quadros' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id
            );
        WHEN 'colunas' THEN
            payload := payload || jsonb_build_object(
                'quadro_id', row_data.quadro_id
            );
        WHEN 'cartoes' THEN
            payload := payload || jsonb_build_object(
                'coluna_id', row_data.coluna_id,
                'workspace_id', row_data.workspace_id
            );
        WHEN 'comentarios' THEN
            payload := payload || jsonb_build_object(
                'cartao_id', row_data.cartao_id
            );
        WHEN 'atividades' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id,
                'quadro_id', row_data.quadro_id,
                'cartao_id', row_data.cartao_id
            );
        WHEN 'notificacoes' THEN
            payload := payload || jsonb_build_object(
                'user_id', row_data.user_id
            );
        WHEN 'poker_sessoes' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id
            );
        WHEN 'poker_votos' THEN
            payload := payload || jsonb_build_object(
                'sessao_id', row_data.sessao_id
            );
        ELSE
            -- tabelas nao mapeadas: so table+op+id
            NULL;
    END CASE;

    -- pg_notify e limitado a 8KB por payload. Pra tabelas grandes (se
    -- algum dia alguem mandar row inteiro), truncar seria necessario.
    -- Hoje so mandamos ids, entao sempre cabe.
    PERFORM pg_notify('realtime_events', payload::text);

    RETURN NULL;  -- AFTER trigger nao precisa retornar NEW
END;
$$;

ALTER FUNCTION public.tg_realtime_notify() OWNER TO postgres;

-- ─────────────────────────────────────────────────────────────────────────
-- Triggers — AFTER INSERT/UPDATE/DELETE FOR EACH ROW
-- ─────────────────────────────────────────────────────────────────────────
-- Drop-and-recreate e idempotente.

DROP TRIGGER IF EXISTS tg_realtime_quadros       ON public.quadros;
DROP TRIGGER IF EXISTS tg_realtime_colunas       ON public.colunas;
DROP TRIGGER IF EXISTS tg_realtime_cartoes       ON public.cartoes;
DROP TRIGGER IF EXISTS tg_realtime_comentarios   ON public.comentarios;
DROP TRIGGER IF EXISTS tg_realtime_atividades    ON public.atividades;
DROP TRIGGER IF EXISTS tg_realtime_notificacoes  ON public.notificacoes;
DROP TRIGGER IF EXISTS tg_realtime_poker_sessoes ON public.poker_sessoes;
DROP TRIGGER IF EXISTS tg_realtime_poker_votos   ON public.poker_votos;

CREATE TRIGGER tg_realtime_quadros
    AFTER INSERT OR UPDATE OR DELETE ON public.quadros
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_colunas
    AFTER INSERT OR UPDATE OR DELETE ON public.colunas
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_cartoes
    AFTER INSERT OR UPDATE OR DELETE ON public.cartoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_comentarios
    AFTER INSERT OR UPDATE OR DELETE ON public.comentarios
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_atividades
    AFTER INSERT OR UPDATE OR DELETE ON public.atividades
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_notificacoes
    AFTER INSERT OR UPDATE OR DELETE ON public.notificacoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_poker_sessoes
    AFTER INSERT OR UPDATE OR DELETE ON public.poker_sessoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_poker_votos
    AFTER INSERT OR UPDATE OR DELETE ON public.poker_votos
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

-- ═══════════════════════════════════════════════════════════════════════
-- Fim do bootstrap. Apos aplicar:
--   - Criar usuario admin: docker compose exec app npx taskflow bootstrap
--   - Validar: docker compose exec app npx taskflow health
-- ═══════════════════════════════════════════════════════════════════════
