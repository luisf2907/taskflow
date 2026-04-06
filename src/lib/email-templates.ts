const ACCENT = "#00857A";
const BG = "#E4F0EE";
const TEXT = "#1C2B29";
const TEXT_SECONDARY = "#4A5D5A";
const BORDER = "#E1EBE9";

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:20px;font-weight:800;color:${ACCENT};letter-spacing:-0.5px">Taskflow</span>
    </div>

    <!-- Card -->
    <div style="background:#FFFFFF;border-radius:16px;padding:32px;border:1px solid ${BORDER}">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:${TEXT_SECONDARY}">
      <p style="margin:0">Voce recebeu este email porque tem uma conta no Taskflow.</p>
      <p style="margin:4px 0 0">Gerencie suas preferencias em <a href="{{siteUrl}}/settings" style="color:${ACCENT}">Configuracoes</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${ACCENT};color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;margin-top:16px">${text}</a>`;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
}

// =============================================
// CONVITE DE WORKSPACE
// =============================================

export function templateConviteWorkspace(params: {
  nomeConvidado: string;
  nomeWorkspace: string;
  nomeConvidador: string;
}) {
  const siteUrl = getSiteUrl();
  const html = layout(`
    <h1 style="font-size:20px;font-weight:800;color:${TEXT};margin:0 0 8px">Voce foi convidado!</h1>
    <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 20px;line-height:1.6">
      <strong style="color:${TEXT}">${params.nomeConvidador}</strong> convidou voce para o workspace
      <strong style="color:${TEXT}">${params.nomeWorkspace}</strong> no Taskflow.
    </p>
    <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 4px;line-height:1.6">
      Acesse sua conta para ver o workspace e comecar a colaborar.
    </p>
    ${button("Acessar Workspace", `${siteUrl}/dashboard`)}
  `).replace("{{siteUrl}}", siteUrl);

  return {
    subject: `Voce foi convidado para ${params.nomeWorkspace} no Taskflow`,
    html,
  };
}

// =============================================
// CARD ATRIBUIDO
// =============================================

export function templateCardAtribuido(params: {
  nomeUsuario: string;
  tituloCard: string;
  nomeWorkspace: string;
  quadroId?: string;
}) {
  const siteUrl = getSiteUrl();
  const link = params.quadroId ? `${siteUrl}/quadro/${params.quadroId}` : `${siteUrl}/dashboard`;
  const html = layout(`
    <h1 style="font-size:20px;font-weight:800;color:${TEXT};margin:0 0 8px">Card atribuido a voce</h1>
    <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 16px;line-height:1.6">
      Voce foi adicionado ao card:
    </p>
    <div style="background:${BG};border-radius:10px;padding:16px;margin-bottom:16px">
      <p style="font-size:15px;font-weight:700;color:${TEXT};margin:0">${params.tituloCard}</p>
      <p style="font-size:12px;color:${TEXT_SECONDARY};margin:4px 0 0">${params.nomeWorkspace}</p>
    </div>
    ${button("Ver Card", link)}
  `).replace("{{siteUrl}}", siteUrl);

  return {
    subject: `Card atribuido: ${params.tituloCard}`,
    html,
  };
}

// =============================================
// DIGEST SEMANAL
// =============================================

export function templateDigestSemanal(params: {
  nomeUsuario: string;
  nomeWorkspace: string;
  cardsCriados: number;
  cardsMovidos: number;
  cardsConcluidos: number;
}) {
  const siteUrl = getSiteUrl();
  const html = layout(`
    <h1 style="font-size:20px;font-weight:800;color:${TEXT};margin:0 0 8px">Resumo semanal</h1>
    <p style="font-size:14px;color:${TEXT_SECONDARY};margin:0 0 20px;line-height:1.6">
      Ola, ${params.nomeUsuario}! Aqui esta o resumo da semana no
      <strong style="color:${TEXT}">${params.nomeWorkspace}</strong>:
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="padding:12px 16px;background:${BG};border-radius:8px 8px 0 0;font-size:14px;color:${TEXT_SECONDARY}">Cards criados</td>
        <td style="padding:12px 16px;background:${BG};border-radius:8px 8px 0 0;font-size:20px;font-weight:800;color:${TEXT};text-align:right">${params.cardsCriados}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:${TEXT_SECONDARY}">Cards movidos</td>
        <td style="padding:12px 16px;font-size:20px;font-weight:800;color:${TEXT};text-align:right">${params.cardsMovidos}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:${BG};border-radius:0 0 8px 8px;font-size:14px;color:${TEXT_SECONDARY}">Cards concluidos</td>
        <td style="padding:12px 16px;background:${BG};border-radius:0 0 8px 8px;font-size:20px;font-weight:800;color:${ACCENT};text-align:right">${params.cardsConcluidos}</td>
      </tr>
    </table>
    ${button("Ver Dashboard", `${siteUrl}/dashboard`)}
  `).replace("{{siteUrl}}", siteUrl);

  return {
    subject: `Resumo semanal — ${params.nomeWorkspace}`,
    html,
  };
}
