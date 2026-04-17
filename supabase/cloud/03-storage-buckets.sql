-- Taskflow Cloud — Passo 3: Storage buckets
-- Criar via Dashboard (Storage > New bucket) OU rodar este SQL

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
