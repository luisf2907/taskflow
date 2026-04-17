-- Taskflow Cloud — Passo 1: Extensions
-- ─────────────────────────────────────────────────────────────────────────
-- 1. Extensions
-- ─────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;       -- OBRIGATORIA: voice embeddings
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- util pro GoTrue
-- Opcionais: descomentar se o operador quiser observabilidade de queries
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
