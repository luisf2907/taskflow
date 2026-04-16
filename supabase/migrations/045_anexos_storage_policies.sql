-- ═══════════════════════════════════════════════════════════════════════
-- Bucket `anexos` — RLS em storage.objects
-- ═══════════════════════════════════════════════════════════════════════
-- Fecha falha de seguranca pre-existente: bucket `anexos` estava registrado
-- como public=true sem nenhuma policy em storage.objects. Qualquer user
-- autenticado podia fazer INSERT/UPDATE/DELETE em arquivo de cartao de
-- qualquer workspace, bastando adivinhar o cartao_id (UUID) do path.
--
-- Path dos anexos: `{cartao_id}/{timestamp}_{filename}`
-- storage.foldername(name)[1] -> cartao_id
--
-- Leitura permanece publica (bucket public=true) — equivalente a policy
-- `wiki_select_publico`. URLs de anexos sao referenciadas em public.anexos
-- que ja tem RLS por workspace.
--
-- Write (INSERT/UPDATE/DELETE) exige que o auth.uid() seja membro do
-- workspace dono do cartao, via JOIN cartoes -> workspace_usuarios.
--
-- OBS: O `SupabaseStorageDriver` usa service_role e bypassa essas
-- policies. A protecao real contra a API do app vive nos handlers de
-- /api/storage/* via `guardAnexoAccess()` (src/lib/anexos-guard.ts).
-- As policies aqui sao defense-in-depth pra acessos via Supabase SDK
-- direto ou PostgREST fora da rota API.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "anexos_select_publico" ON storage.objects;
DROP POLICY IF EXISTS "anexos_insert_membros" ON storage.objects;
DROP POLICY IF EXISTS "anexos_update_membros" ON storage.objects;
DROP POLICY IF EXISTS "anexos_delete_membros" ON storage.objects;

CREATE POLICY "anexos_select_publico"
ON storage.objects
FOR SELECT
USING (bucket_id = 'anexos');

CREATE POLICY "anexos_insert_membros"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.cartoes c
    JOIN public.workspace_usuarios wu ON wu.workspace_id = c.workspace_id
    WHERE c.id = ((storage.foldername(name))[1])::uuid
      AND wu.user_id = auth.uid()
  )
);

CREATE POLICY "anexos_update_membros"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.cartoes c
    JOIN public.workspace_usuarios wu ON wu.workspace_id = c.workspace_id
    WHERE c.id = ((storage.foldername(name))[1])::uuid
      AND wu.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.cartoes c
    JOIN public.workspace_usuarios wu ON wu.workspace_id = c.workspace_id
    WHERE c.id = ((storage.foldername(name))[1])::uuid
      AND wu.user_id = auth.uid()
  )
);

CREATE POLICY "anexos_delete_membros"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.cartoes c
    JOIN public.workspace_usuarios wu ON wu.workspace_id = c.workspace_id
    WHERE c.id = ((storage.foldername(name))[1])::uuid
      AND wu.user_id = auth.uid()
  )
);
