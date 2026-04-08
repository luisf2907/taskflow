-- =============================================================================
-- 033_fix_membros_auto_sync.sql
-- -----------------------------------------------------------------------------
-- Remove duplicatas de membros e move a sincronizacao workspace_usuarios →
-- membros para um trigger no banco.
--
-- Duplicatas cobertas (em ordem):
--   1. (workspace_id, lower(email))  — mesmo email no mesmo workspace
--   2. (workspace_id, lower(nome))   — fallback: mesmo nome quando nao ha email
--   3. (workspace_id, user_id)       — rows criadas em race condition
--
-- Prioridade ao escolher qual row manter: rows com user_id IS NOT NULL vem
-- primeiro (sao as "reais" ligadas a auth), depois por criado_em mais antigo.
-- Referencias em cartao_membros sao migradas para a row mantida.
-- =============================================================================

-- Helper: dedup generico. Recebe uma lista de ids de duplicatas ordenados
-- (primeiro = keep) e migra cartao_membros + deleta as duplicatas.
CREATE OR REPLACE FUNCTION public._dedup_membros_group(keep_id UUID, delete_ids UUID[])
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF delete_ids IS NULL OR array_length(delete_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Migra cartao_membros dos duplicados → keep (ignora se ja tem)
  INSERT INTO public.cartao_membros (cartao_id, membro_id)
  SELECT DISTINCT cartao_id, keep_id
  FROM public.cartao_membros
  WHERE membro_id = ANY(delete_ids)
  ON CONFLICT (cartao_id, membro_id) DO NOTHING;

  -- Deleta cartao_membros das duplicatas
  DELETE FROM public.cartao_membros WHERE membro_id = ANY(delete_ids);

  -- Deleta membros duplicados
  DELETE FROM public.membros WHERE id = ANY(delete_ids);
END;
$$;

-- =============================================================================
-- PASSO 1: Dedup por (workspace_id, LOWER(TRIM(email)))
-- =============================================================================
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      workspace_id,
      array_agg(id ORDER BY
        CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
        criado_em
      ) AS ids
    FROM public.membros
    WHERE workspace_id IS NOT NULL
      AND email IS NOT NULL
      AND TRIM(email) != ''
    GROUP BY workspace_id, LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  LOOP
    PERFORM public._dedup_membros_group(
      dup.ids[1],
      dup.ids[2:array_length(dup.ids, 1)]
    );
  END LOOP;
END $$;

-- =============================================================================
-- PASSO 2: Dedup por (workspace_id, LOWER(TRIM(nome))) para rows SEM email
-- =============================================================================
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      workspace_id,
      array_agg(id ORDER BY
        CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
        criado_em
      ) AS ids
    FROM public.membros
    WHERE workspace_id IS NOT NULL
      AND (email IS NULL OR TRIM(email) = '')
      AND nome IS NOT NULL
      AND TRIM(nome) != ''
    GROUP BY workspace_id, LOWER(TRIM(nome))
    HAVING COUNT(*) > 1
  LOOP
    PERFORM public._dedup_membros_group(
      dup.ids[1],
      dup.ids[2:array_length(dup.ids, 1)]
    );
  END LOOP;
END $$;

-- =============================================================================
-- PASSO 3: Dedup por (workspace_id, user_id) — rows com mesmo user_id
-- =============================================================================
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      workspace_id,
      user_id,
      array_agg(id ORDER BY criado_em) AS ids
    FROM public.membros
    WHERE workspace_id IS NOT NULL
      AND user_id IS NOT NULL
    GROUP BY workspace_id, user_id
    HAVING COUNT(*) > 1
  LOOP
    PERFORM public._dedup_membros_group(
      dup.ids[1],
      dup.ids[2:array_length(dup.ids, 1)]
    );
  END LOOP;
END $$;

-- Helper ja cumpriu sua funcao
DROP FUNCTION IF EXISTS public._dedup_membros_group(UUID, UUID[]);

-- =============================================================================
-- PASSO 4: Constraints de unicidade
--
-- Duas camadas de protecao:
--   A) UNIQUE (workspace_id, user_id) — previne race de mesmo auth user
--   B) UNIQUE partial em (workspace_id, LOWER(TRIM(email))) — previne
--      mesma pessoa com user_ids diferentes (oauth vs email/password,
--      multiplas contas auth.users para a mesma pessoa, etc).
-- =============================================================================

-- Remove index parcial antigo (ordem invertida, so filtrava user_id not null)
DROP INDEX IF EXISTS public.idx_membros_user_workspace_unique;

-- (A) Constraint plena por (workspace_id, user_id)
ALTER TABLE public.membros
  DROP CONSTRAINT IF EXISTS membros_workspace_user_unique;

ALTER TABLE public.membros
  ADD CONSTRAINT membros_workspace_user_unique
  UNIQUE (workspace_id, user_id);

-- (B) Unique index parcial por (workspace_id, LOWER(TRIM(email)))
-- Case-insensitive, ignora NULLs e strings vazias. Previne que duas rows
-- com o mesmo email coexistam no mesmo workspace.
DROP INDEX IF EXISTS public.idx_membros_workspace_email_unique;

CREATE UNIQUE INDEX idx_membros_workspace_email_unique
  ON public.membros (workspace_id, LOWER(TRIM(email)))
  WHERE email IS NOT NULL AND TRIM(email) != '';

-- =============================================================================
-- PASSO 5: Trigger auto-sync workspace_usuarios → membros
-- Substitui a logica client-side em useMembrosWorkspace (fonte de duplicatas
-- por race condition).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_sync_membro_from_workspace_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil RECORD;
  v_avatar_cores TEXT[] := ARRAY[
    '#EF4444','#F97316','#EAB308','#22C55E','#14B8A6',
    '#3B82F6','#6366F1','#A855F7','#EC4899','#78716C'
  ];
  v_cor TEXT;
  v_count INT;
BEGIN
  SELECT id, nome, email, avatar_url
  INTO v_perfil
  FROM public.perfis
  WHERE id = NEW.user_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Se ja existe membro com o mesmo email no workspace (mesmo que de outro
  -- user_id), nao cria duplicata. Cobre o caso de oauth + email/password
  -- criando contas auth.users diferentes para a mesma pessoa.
  IF v_perfil.email IS NOT NULL AND TRIM(v_perfil.email) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.membros
      WHERE workspace_id = NEW.workspace_id
        AND email IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(v_perfil.email))
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Se ja existe membro com o mesmo user_id (coberto tambem pela constraint,
  -- mas verificacao explicita evita excecao desnecessaria).
  IF EXISTS (
    SELECT 1 FROM public.membros
    WHERE workspace_id = NEW.workspace_id
      AND user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Conta membros existentes no workspace pra escolher cor deterministicamente
  SELECT COUNT(*) INTO v_count
  FROM public.membros
  WHERE workspace_id = NEW.workspace_id;

  v_cor := v_avatar_cores[(v_count % array_length(v_avatar_cores, 1)) + 1];

  INSERT INTO public.membros (
    workspace_id,
    quadro_id,
    nome,
    email,
    cor_avatar,
    avatar_url,
    user_id
  )
  VALUES (
    NEW.workspace_id,
    NULL,
    COALESCE(v_perfil.nome, v_perfil.email, 'Membro'),
    v_perfil.email,
    v_cor,
    v_perfil.avatar_url,
    v_perfil.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_sync_membro ON public.workspace_usuarios;

CREATE TRIGGER trg_auto_sync_membro
AFTER INSERT ON public.workspace_usuarios
FOR EACH ROW
EXECUTE FUNCTION public.auto_sync_membro_from_workspace_usuario();

-- =============================================================================
-- PASSO 6: Backfill — garante membros para todos os workspace_usuarios
-- existentes que ainda nao tem. Pula se ja existe membro com mesmo email
-- no workspace (evita reintroduzir duplicatas que acabamos de deduplir).
-- =============================================================================

INSERT INTO public.membros (
  workspace_id, quadro_id, nome, email, cor_avatar, avatar_url, user_id
)
SELECT
  wu.workspace_id,
  NULL,
  COALESCE(p.nome, p.email, 'Membro'),
  p.email,
  '#3B82F6',
  p.avatar_url,
  p.id
FROM public.workspace_usuarios wu
JOIN public.perfis p ON p.id = wu.user_id
WHERE NOT EXISTS (
  -- Nao insere se ja existe membro com mesmo user_id no workspace
  SELECT 1 FROM public.membros m
  WHERE m.workspace_id = wu.workspace_id
    AND m.user_id = p.id
)
AND NOT EXISTS (
  -- Nao insere se ja existe membro com mesmo email no workspace
  SELECT 1 FROM public.membros m
  WHERE m.workspace_id = wu.workspace_id
    AND p.email IS NOT NULL
    AND TRIM(p.email) != ''
    AND m.email IS NOT NULL
    AND LOWER(TRIM(m.email)) = LOWER(TRIM(p.email))
)
ON CONFLICT DO NOTHING;
