-- =============================================================================
-- 040_theme_coral_user.sql
-- -----------------------------------------------------------------------------
-- 1. Garante que a coluna theme_preferences existe
-- 2. Seta paleta coral completa (#d37654) com light + dark para
--    dialcamonarca@gmail.com
-- =============================================================================

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS theme_preferences JSONB DEFAULT NULL;

UPDATE public.perfis
SET theme_preferences = '{
  "light": {
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
  },
  "dark": {
    "accent":       "#E89070",
    "accentHover":  "#F0A488",
    "accentLight":  "#2E1C14",
    "accentText":   "#F0B89E",
    "bg":           "#1A110D",
    "bgSecondary":  "#231812",
    "surface":      "#2C1F18",
    "surfaceHover": "#3A2A20",
    "text":         "#F0DDD4",
    "textSecondary":"#BFA090",
    "textTertiary": "#9A7E6E",
    "border":       "#3D2C22",
    "borderSubtle": "#33241A",
    "success":      "#7FB56E",
    "successBg":    "#1E2A1A",
    "danger":       "#F07060",
    "dangerBg":     "#3E1E1A",
    "warning":      "#E0A840",
    "warningBg":    "#2E2518",
    "column":       "#211710",
    "header":       "#1A110D",
    "headerText":   "#F0DDD4"
  }
}'::jsonb
WHERE email = 'dialcamonarca@gmail.com';
