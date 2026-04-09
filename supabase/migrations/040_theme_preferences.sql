-- =============================================================================
-- 040_theme_preferences.sql
-- -----------------------------------------------------------------------------
-- Adiciona coluna para paleta de cores personalizada por usuario.
-- Armazena como JSONB — null = paleta padrao.
-- Formato: { "accent": "#6366F1", "bg": "#EEF2FF", ... }
-- =============================================================================

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS theme_preferences JSONB DEFAULT NULL;
