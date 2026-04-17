-- Taskflow Cloud — Passo extra: trigger auth.users → public.perfis
-- Cria automaticamente row em perfis quando um user e criado.
-- Pode ja existir se voce rodou migration 009 — seguro re-rodar.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
