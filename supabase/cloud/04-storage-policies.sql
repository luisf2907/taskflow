-- Taskflow Cloud — Passo 4: Storage policies (RLS em storage.objects)
-- Inclui policies de wiki, reunioes-audio e anexos

-- 4. Storage policies — RLS em storage.objects
-- ─────────────────────────────────────────────────────────────────────────
-- anexos_*: espelha supabase/migrations/045_anexos_storage_policies.sql.
-- Path no bucket: {cartao_id}/{timestamp}_{filename} — foldername(name)[1]
-- eh cartao_id. Leitura publica (bucket public=true); write exige membro
-- do workspace dono do cartao. Defense-in-depth: SupabaseStorageDriver
-- usa service_role e bypassa, protecao real vive em guardAnexoAccess().

DROP POLICY IF EXISTS "wiki_select_publico" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_upload_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_update_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "wiki_delete_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_select" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_insert" ON "storage"."objects";
DROP POLICY IF EXISTS "reunioes_audio_delete" ON "storage"."objects";
DROP POLICY IF EXISTS "anexos_select_publico" ON "storage"."objects";
DROP POLICY IF EXISTS "anexos_insert_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "anexos_update_membros" ON "storage"."objects";
DROP POLICY IF EXISTS "anexos_delete_membros" ON "storage"."objects";

CREATE POLICY "reunioes_audio_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'reunioes-audio'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."audio_path" = "objects"."name") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))));
CREATE POLICY "reunioes_audio_insert" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'reunioes-audio'::"text") AND ("auth"."uid"() IS NOT NULL)));
CREATE POLICY "reunioes_audio_select" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'reunioes-audio'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."reunioes" "r"
  WHERE (("r"."audio_path" = "objects"."name") AND ("r"."workspace_id" IN ( SELECT "public"."my_workspace_ids"() AS "my_workspace_ids")))))));
CREATE POLICY "wiki_delete_membros" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));
CREATE POLICY "wiki_select_publico" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'wiki'::"text"));
CREATE POLICY "wiki_update_membros" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));
CREATE POLICY "wiki_upload_membros" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'wiki'::"text") AND ((("storage"."foldername"("name"))[1])::"uuid" IN ( SELECT "workspace_usuarios"."workspace_id"
   FROM "public"."workspace_usuarios"
  WHERE ("workspace_usuarios"."user_id" = "auth"."uid"())))));

CREATE POLICY "anexos_select_publico" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'anexos'::"text"));
CREATE POLICY "anexos_insert_membros" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'anexos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
     JOIN "public"."workspace_usuarios" "wu" ON (("wu"."workspace_id" = "c"."workspace_id"))
  WHERE (("c"."id" = (((("storage"."foldername"("name"))[1]))::"uuid")) AND ("wu"."user_id" = "auth"."uid"()))))));
CREATE POLICY "anexos_update_membros" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'anexos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
     JOIN "public"."workspace_usuarios" "wu" ON (("wu"."workspace_id" = "c"."workspace_id"))
  WHERE (("c"."id" = (((("storage"."foldername"("name"))[1]))::"uuid")) AND ("wu"."user_id" = "auth"."uid"())))))) WITH CHECK ((("bucket_id" = 'anexos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
     JOIN "public"."workspace_usuarios" "wu" ON (("wu"."workspace_id" = "c"."workspace_id"))
  WHERE (("c"."id" = (((("storage"."foldername"("name"))[1]))::"uuid")) AND ("wu"."user_id" = "auth"."uid"()))))));
CREATE POLICY "anexos_delete_membros" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'anexos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."cartoes" "c"
     JOIN "public"."workspace_usuarios" "wu" ON (("wu"."workspace_id" = "c"."workspace_id"))
  WHERE (("c"."id" = (((("storage"."foldername"("name"))[1]))::"uuid")) AND ("wu"."user_id" = "auth"."uid"()))))));


