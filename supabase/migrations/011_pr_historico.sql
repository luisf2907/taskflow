-- Histórico de PRs no card (array JSON)
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS pr_historico JSONB DEFAULT '[]'::jsonb;
