-- =============================================================================
-- 037_fix_trigger_membros_quadro_id.sql
-- -----------------------------------------------------------------------------
-- A migration 035 removeu a coluna quadro_id da tabela membros, mas o trigger
-- auto_sync_membro_from_workspace_usuario ainda referenciava essa coluna,
-- causando: "column quadro_id of relation membros does not exist".
--
-- Recria o trigger sem a coluna quadro_id.
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
      -- Atualiza o user_id do membro existente (pode estar null)
      UPDATE public.membros
      SET user_id = COALESCE(user_id, NEW.user_id),
          nome = COALESCE(v_perfil.nome, nome),
          avatar_url = COALESCE(v_perfil.avatar_url, avatar_url)
      WHERE workspace_id = NEW.workspace_id
        AND email IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(TRIM(v_perfil.email))
        AND (user_id IS NULL OR user_id = NEW.user_id);
      RETURN NEW;
    END IF;
  END IF;

  -- Se ja existe membro com o mesmo user_id
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
    nome,
    email,
    cor_avatar,
    avatar_url,
    user_id
  )
  VALUES (
    NEW.workspace_id,
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
