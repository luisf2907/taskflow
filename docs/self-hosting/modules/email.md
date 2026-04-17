# Módulo: Email

Envio de emails — convites de workspace, notificações, recuperação
de senha. Plugável via `EMAIL_DRIVER`.

## Drivers

| Driver | Uso | Requisitos |
|---|---|---|
| `resend` | Cloud default | `RESEND_API_KEY` |
| `smtp` | Self-hosted c/ SMTP server | `SMTP_HOST` + auth |
| `console` | Dev/debug | — (loga no stdout) |
| `disabled` | Desliga totalmente | — |

## Setup

### `resend` (cloud)

```env
EMAIL_DRIVER=resend
RESEND_API_KEY=re_xxx
```
Auto-detect: se `RESEND_API_KEY` estiver setada e `EMAIL_DRIVER` não, vira `resend`.

### `smtp` (self-hosted mais comum)

Gmail relay:
```env
EMAIL_DRIVER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password   # gerada em security.google.com
SMTP_FROM="Taskflow <seu-email@gmail.com>"
```

Mailgun/Postmark/SendGrid SMTP: mesma coisa, credenciais diferentes.

Servidor interno (Postfix, Haraka): porta 25 sem SSL normalmente.
```env
EMAIL_DRIVER=smtp
SMTP_HOST=postfix
SMTP_PORT=25
SMTP_FROM=noreply@empresa.lab
SMTP_SECURE=false
```

### `console` (dev)

```env
EMAIL_DRIVER=console
```
Emails aparecem em bloco formatado nos logs do container app:
```
docker compose logs -f app
```
Útil pra testar templates e ver conteúdo sem enviar.

### `disabled`

```env
EMAIL_DRIVER=disabled
```

Comportamento resultante:
- **Convites de workspace**: modal mostra link copiável (admin manda via outro canal)
- **Card atribuído**: só notificação in-app, sem email
- **Reset de senha**: não funciona via email → usar `npx taskflow user:reset-password`

## O que dispara email

| Evento | Implementado |
|---|---|
| Convite de workspace | ✅ quando aceitar o link |
| Card atribuído a alguém | ✅ |
| Reset de senha | ⚠️ flow atual usa Supabase Auth — depende de `GOTRUE_MAILER_*` envs |
| Confirmação de signup | ⚠️ idem |
| Mention em comentário | ❌ não implementado |
| Resumo diário | ❌ não implementado |

## Troubleshooting

### `EMAIL_DRIVER=smtp` não envia

```bash
# Logs do app
docker compose -f docker/docker-compose.solo.yml logs app --tail 30 | grep -i email
```

Erros comuns:
- `535 Authentication failed` — SMTP_USER/PASSWORD errados. Gmail exige **app password**, não senha normal.
- `Connection timeout` — porta errada (tenta 587, 465, 25) ou firewall.
- `Self-signed certificate` — provedor com cert custom. Configurar `SMTP_SECURE=false` pra TLS STARTTLS (em vez de SSL direto).

### GoTrue não manda email de confirmação

GoTrue tem SMTP próprio (separado do driver do app). Pra signup/recovery email funcionar, também precisa configurar no container `gotrue` no docker-compose:

```yaml
gotrue:
  environment:
    GOTRUE_SMTP_HOST: smtp.gmail.com
    GOTRUE_SMTP_PORT: 587
    GOTRUE_SMTP_USER: seu-email@gmail.com
    GOTRUE_SMTP_PASS: app-password
    GOTRUE_SMTP_ADMIN_EMAIL: seu-email@gmail.com
    GOTRUE_MAILER_AUTOCONFIRM: "false"  # exige confirm por email
```

No perfil solo default, `GOTRUE_MAILER_AUTOCONFIRM=true` pula isso — não envia email e confirma o user direto. Desligar se quer fluxo completo.
