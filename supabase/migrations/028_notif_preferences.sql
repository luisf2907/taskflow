-- 028: Preferencias de notificacao no perfil do usuario
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS notif_preferences JSONB DEFAULT '{
  "email_convite": true,
  "email_card_atribuido": true,
  "email_digest_semanal": false,
  "inapp_todas": true
}'::jsonb;
