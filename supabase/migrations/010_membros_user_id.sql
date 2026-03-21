-- Adicionar user_id e avatar_url na tabela membros
ALTER TABLE membros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS avatar_url TEXT;
CREATE INDEX IF NOT EXISTS idx_membros_user_id ON membros(user_id);
