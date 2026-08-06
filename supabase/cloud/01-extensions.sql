-- Taskflow Cloud — Passo 1: Extensions
-- ═══════════════════════════════════════════════════════════════════════
--
-- O 02-schema.sql referencia o tipo como "public"."vector" em 8 pontos: o
-- parametro de match_voice_profiles, a coluna perfis.voice_embedding(256)
-- e os GRANTs correspondentes. Isso vem do dump de origem, onde a
-- extensao vivia em public.
--
-- No Supabase (cloud e self-hosted oficial) a convencao e outra: extensoes
-- ficam no schema "extensions". Com o vector la, um
--   CREATE EXTENSION IF NOT EXISTS vector
-- vira no-op — a extensao existe, so que em outro schema — e o 02 morre em
--
--   ERROR: 42704: type public.vector does not exist
--
-- Dai os dois passos abaixo: instalar se faltar, e mover para public se
-- estiver em outro lugar. O IF NOT EXISTS sozinho nao resolve, porque
-- checa a existencia da extensao, nao o schema dela.
--
-- Mover e seguro AQUI: num banco recem-criado nada depende do vector
-- ainda. Depois do schema populado, o ALTER falharia.
--
-- O operador <=> e o index hnsw usados em match_voice_profiles tambem
-- pertencem a extensao e seguem o tipo — mais um motivo para normalizar o
-- schema aqui em vez de qualificar caso a caso no 02.
-- ═══════════════════════════════════════════════════════════════════════

-- Instala se ainda nao existir (no-op se ja existir em qualquer schema).
CREATE EXTENSION IF NOT EXISTS vector;

-- Garante que o tipo seja alcancavel como public.vector.
--
-- ALTER EXTENSION ... SET SCHEMA falha se o destino ja for o schema atual,
-- entao so roda quando ha de fato o que mover. Vai num bloco DO porque
-- CREATE EXTENSION nao pode ser executado de dentro de funcao — por isso
-- os dois comandos estao separados em vez de num DO so.
DO $$
BEGIN
  IF (
    SELECT n.nspname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector'
  ) IS DISTINCT FROM 'public' THEN
    EXECUTE 'ALTER EXTENSION vector SET SCHEMA public';
  END IF;
END
$$;

-- Util pro GoTrue. gen_random_uuid() NAO depende dela: e nativa do
-- Postgres 13+, e o 02-schema.sql a usa 26 vezes sem qualificar schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Opcional: descomente se quiser observabilidade de queries. Foi o que
-- permitiu diagnosticar o consumo do Realtime na instancia cloud.
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
