-- ═══════════════════════════════════════════════════════════════════════
-- Postgres init — databases auxiliares
-- ═══════════════════════════════════════════════════════════════════════
-- Rodado automaticamente pelo entrypoint do Postgres na PRIMEIRA vez que
-- o cluster e criado (volume novo). Nao roda de novo em restarts.
--
-- POR QUE ESTE ARQUIVO EXISTE
-- O perfil "full" sobe glitchtip e glitchtip-worker apontando para
-- postgres://postgres:...@postgres:5432/glitchtip, mas o servico postgres
-- so declara POSTGRES_DB=taskflow — e o entrypoint cria unicamente esse.
-- Ninguem mais criava o database "glitchtip". Resultado: os dois
-- containers entravam em loop de
--     FATAL: database "glitchtip" does not exist
-- desde a primeira subida, nao apenas em volumes reaproveitados.
--
-- Prefixo 00- para rodar antes do 01-init.sql: CREATE DATABASE nao pode
-- executar dentro de bloco de transacao, entao fica isolado neste arquivo.
--
-- CREATE DATABASE nao aceita IF NOT EXISTS em nenhuma versao do Postgres.
-- O \gexec do psql resolve: a consulta so produz a string do comando
-- quando o database ainda nao existe, e o \gexec executa o que veio.
--
-- Nos perfis solo e team o GlitchTip nao sobe. O database e criado do
-- mesmo jeito (uns 7 MB vazios) para manter um unico postgres-init entre
-- os perfis — trocar isso por um script por perfil custaria mais do que
-- economiza.
-- ═══════════════════════════════════════════════════════════════════════

SELECT 'CREATE DATABASE glitchtip'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'glitchtip')\gexec
