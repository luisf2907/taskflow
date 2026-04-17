-- ═══════════════════════════════════════════════════════════════════════
-- perfis.must_change_password — flag pra forcar troca no primeiro login
-- ═══════════════════════════════════════════════════════════════════════
-- Usado pelo CLI user:create no perfil team: admin cria user com senha
-- temporaria, user e obrigado a trocar no primeiro acesso.
--
-- O proxy (src/proxy.ts) le app_metadata.must_change_password do JWT
-- (performance: zero round-trip extra ao DB). Esta coluna eh apenas
-- backup/consistency — atualizada junto com app_metadata quando o user
-- define senha nova em /trocar-senha.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
