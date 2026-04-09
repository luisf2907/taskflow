-- =============================================================================
-- 040_theme_coral_user.sql
-- -----------------------------------------------------------------------------
-- 1. Garante que a coluna theme_preferences existe
-- 2. Seta paleta coral completa (#d37654) para dialcamonarca@gmail.com
--
-- A paleta cobre TODOS os componentes: sidebar, kanban, header, cards,
-- backgrounds, borders, status colors — tudo derivado do accent coral.
-- =============================================================================

-- Garantir coluna
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS theme_preferences JSONB DEFAULT NULL;

-- Paleta coral completa para o usuario
UPDATE public.perfis
SET theme_preferences = '{
  "accent":       "#D37654",
  "accentHover":  "#B8603F",
  "accentLight":  "#FDF2EE",
  "accentText":   "#8C4428",
  "bg":           "#FBF0EB",
  "bgSecondary":  "#F3E2DA",
  "surface":      "#FFFFFF",
  "surfaceHover": "#FDF7F5",
  "text":         "#3D1E0F",
  "textSecondary":"#7A5443",
  "textTertiary": "#906B5A",
  "border":       "#EEDDD4",
  "borderSubtle": "#F5EBE5",
  "success":      "#6B8F5B",
  "successBg":    "#F0F5EC",
  "danger":       "#C9463F",
  "dangerBg":     "#FDECEB",
  "warning":      "#C49032",
  "warningBg":    "#FDF6E8",
  "column":       "#FAF3EF",
  "header":       "#FBF0EB",
  "headerText":   "#3D1E0F"
}'::jsonb
WHERE email = 'dialcamonarca@gmail.com';
