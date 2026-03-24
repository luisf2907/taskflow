-- Adicionar campos de branch ao cartão para associar a uma branch do GitHub
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS branch_repo_id UUID REFERENCES repositorios(id);
