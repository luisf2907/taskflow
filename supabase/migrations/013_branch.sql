-- Adicionar campo branch ao cartão para associar a uma branch do GitHub
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS branch TEXT;
