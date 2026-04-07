-- 030: Onboarding state persistente no perfil (substitui localStorage)
ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
