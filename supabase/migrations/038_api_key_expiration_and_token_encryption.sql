-- =============================================================================
-- 038_api_key_expiration_and_token_encryption.sql
-- -----------------------------------------------------------------------------
-- P1 Security:
-- 1. Adiciona expires_at em api_keys para suportar expiração
-- 2. Adiciona encrypted_token em github_tokens para encryption at rest
-- =============================================================================

-- API Keys: expiração
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- GitHub Tokens: campo para token encriptado (coexiste com provider_token
-- durante migração; após backfill, provider_token pode ser nullificado)
ALTER TABLE public.github_tokens
  ADD COLUMN IF NOT EXISTS encrypted_token TEXT;
