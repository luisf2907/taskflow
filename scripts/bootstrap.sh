#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════
# bootstrap.sh — Aplica o bootstrap.sql no Postgres
# ═══════════════════════════════════════════════════════════════════════
# Rodado pelo container one-shot "bootstrap" do docker-compose.
# Aguarda postgres e GoTrue estarem prontos, depois aplica o SQL.
#
# Ordem importante:
#   - GoTrue cria schema "auth" na primeira subida
#   - Este script roda DEPOIS disso, garantindo que funcoes que
#     referenciam auth.uid() e auth.users funcionem
#   - Container app espera este terminar com sucesso antes de subir
#
# Idempotente: o proprio bootstrap.sql usa IF NOT EXISTS / OR REPLACE /
# DROP POLICY IF EXISTS. Re-executar nao quebra dados.
# ═══════════════════════════════════════════════════════════════════════

set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-taskflow}"

echo "[bootstrap] Aguardando Postgres em ${PGHOST}:${PGPORT}..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; do
  sleep 1
done
echo "[bootstrap] Postgres pronto."

# GoTrue cria o schema "auth" na primeira conexao. Esperar ate que o
# schema exista (usamos SELECT generico pra provocar a criacao se ainda
# nao rolou — mas na pratica GoTrue ja vai ter criado).
echo "[bootstrap] Verificando schema 'auth'..."
for i in $(seq 1 30); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
     "SELECT 1 FROM information_schema.schemata WHERE schema_name='auth';" | grep -q 1; then
    echo "[bootstrap] Schema 'auth' pronto."
    break
  fi
  echo "[bootstrap] Esperando schema 'auth'... (tentativa $i/30)"
  sleep 2
done

# NOTA: no perfil solo, nao temos storage-api. O bootstrap.sql ainda
# referencia schema "storage" no seu bloco de policies — vamos garantir
# que ele exista minimamente (so as tabelas buckets/objects) usando o
# Script oficial da Supabase seria ideal, mas por ora criamos vazio e
# o app com STORAGE_DRIVER=local-disk nao depende de storage-api.
echo "[bootstrap] Criando schema 'storage' minimo (se nao existir)..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" <<'SQL'
CREATE SCHEMA IF NOT EXISTS storage;

-- Tabela minima de buckets (replica o contrato do supabase/storage-api)
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    public boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now()
);

-- Helpers usados pelas policies de storage
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE sql IMMUTABLE AS $$
    SELECT string_to_array(name, '/');
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
SQL
echo "[bootstrap] Schema 'storage' ok."

echo "[bootstrap] Aplicando bootstrap.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
     -v ON_ERROR_STOP=1 \
     -f /bootstrap.sql

echo "[bootstrap] ✓ Schema aplicado com sucesso."
echo "[bootstrap] Proximo passo: criar usuario admin com"
echo "[bootstrap]   docker compose exec app npx taskflow bootstrap"
