-- ═══════════════════════════════════════════════════════════════════════
-- Postgres init — cria schemas e roles que o stack Supabase espera
-- ═══════════════════════════════════════════════════════════════════════
-- Rodado automaticamente pelo entrypoint do Postgres na PRIMEIRA vez que
-- o DB e criado (volume novo). Nao roda de novo em restarts.
--
-- A imagem pgvector/pgvector:pg17 e postgres vanilla + extension vector.
-- Diferente do supabase/postgres que ja vem com esses schemas/roles
-- pre-criados. Este script preenche o gap.
--
-- Ordem de execucao do stack:
--   1. postgres inicia → executa este script → schemas+roles prontos
--   2. gotrue conecta no schema 'auth' existente → roda suas migrations
--      → cria auth.users, auth.identities, etc
--   3. bootstrap.sh aplica bootstrap.sql → FKs pra auth.users funcionam
-- ═══════════════════════════════════════════════════════════════════════

-- ───── Schemas ─────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- ───── Roles que o dump de producao referencia (GRANTs) ─────
-- anon/authenticated/service_role: PostgREST faz SET ROLE pra um deles
--   baseado no claim "role" do JWT.
-- NOINHERIT: so tem privilegios via SET ROLE, nao automaticamente.
-- BYPASSRLS em service_role: contorna RLS (usado pelo admin da app).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOINHERIT BYPASSRLS;
  END IF;
  -- authenticator: usado pelo PostgREST pra logar e depois SET ROLE.
  -- Senha e a mesma do postgres (simplificacao — operador pode rotar depois).
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'authenticator-changeme';
  END IF;
END
$$;

-- ───── Grants entre roles ─────
GRANT anon, authenticated, service_role TO authenticator;
GRANT anon, authenticated, service_role TO postgres;

-- ───── Privilegios no schema public ─────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;

-- Default privileges: toda tabela/function criada depois herda estes grants
-- automaticamente. Evita ter que repetir GRANT em cada nova criacao.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ───── Privilegios no schema auth ─────
-- GoTrue precisa criar tabelas. Dar owner ao role 'postgres' (GoTrue conecta
-- como postgres no solo). Operador que for multi-user deve criar role
-- 'supabase_auth_admin' dedicado.
GRANT ALL ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ───── Privilegios no schema storage ─────
GRANT ALL ON SCHEMA storage TO postgres;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
