-- ═══════════════════════════════════════════════════════════════════════
-- Postgres init — tabelas minimas do schema 'storage'
-- ═══════════════════════════════════════════════════════════════════════
-- Replica o contrato do supabase/storage-api com o minimo necessario pro
-- perfil solo (onde nao temos o container storage-api rodando).
--
-- O app em modo STORAGE_DRIVER=local-disk NAO precisa dessas tabelas pra
-- armazenar arquivos, mas o bootstrap.sql tem INSERTs em storage.buckets
-- e policies em storage.objects (herdados do dump de producao).
--
-- No perfil full, o container storage-api cria essas tabelas com schema
-- completo; esta inicializacao deve ser pulada (ou as tabelas sao
-- re-criadas com IF NOT EXISTS, sem destruir dados).
-- ═══════════════════════════════════════════════════════════════════════

-- Schema ja foi criado em 01-init.sql
-- CREATE SCHEMA IF NOT EXISTS storage;  -- redundante

-- ───── storage.buckets ─────
CREATE TABLE IF NOT EXISTS storage.buckets (
    id                  text PRIMARY KEY,
    name                text NOT NULL UNIQUE,
    public              boolean DEFAULT false,
    file_size_limit     bigint,
    allowed_mime_types  text[],
    owner               uuid,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- ───── storage.objects ─────
CREATE TABLE IF NOT EXISTS storage.objects (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id           text REFERENCES storage.buckets(id) ON DELETE CASCADE,
    name                text,
    owner               uuid,
    metadata            jsonb,
    path_tokens         text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    last_accessed_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bucketid_objname_idx
    ON storage.objects USING btree (bucket_id, name);

-- ───── Helpers usados pelas policies ─────
-- storage.foldername(name) retorna array com as "pastas" do path
-- Usado em policies tipo: foldername(name)[1] = workspace_id
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
    SELECT string_to_array(name, '/');
$$;

-- ───── RLS habilitada ─────
-- Policies especificas sao aplicadas pelo bootstrap.sql (herdadas do dump)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- ───── Grants ─────
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
