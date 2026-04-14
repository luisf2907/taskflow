-- =============================================
-- Bucket: wiki
-- Storage publico para imagens inseridas na wiki.
-- Estrutura: {workspace_id}/{pagina_id}/{timestamp}_{filename}
-- Limite: 5MB por arquivo, apenas imagens.
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wiki',
  'wiki',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- RLS Policies
-- Leitura: publica (bucket public)
-- Upload/Delete: apenas membros do workspace da imagem
-- =============================================

-- Upload: usuario autenticado que e membro do workspace no path
DROP POLICY IF EXISTS "wiki_upload_membros" ON storage.objects;
CREATE POLICY "wiki_upload_membros"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wiki'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT workspace_id FROM workspace_usuarios WHERE user_id = auth.uid()
    )
  )
);

-- Leitura: publica (bucket e publico, mas deixamos explicito)
DROP POLICY IF EXISTS "wiki_select_publico" ON storage.objects;
CREATE POLICY "wiki_select_publico"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'wiki');

-- Delete: apenas membros do workspace
DROP POLICY IF EXISTS "wiki_delete_membros" ON storage.objects;
CREATE POLICY "wiki_delete_membros"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wiki'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT workspace_id FROM workspace_usuarios WHERE user_id = auth.uid()
    )
  )
);

-- Update (renomeacao): apenas membros do workspace
DROP POLICY IF EXISTS "wiki_update_membros" ON storage.objects;
CREATE POLICY "wiki_update_membros"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wiki'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT workspace_id FROM workspace_usuarios WHERE user_id = auth.uid()
    )
  )
);
