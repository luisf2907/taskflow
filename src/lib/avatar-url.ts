// ═══════════════════════════════════════════════════════════════════════
// Dimensionamento de avatar do GitHub
// ═══════════════════════════════════════════════════════════════════════
// O GitHub serve avatares em 400x400 por padrao. Exibimos em 24-32px, entao
// eram ~17 KiB baixados pra pintar 24 pixels — o Lighthouse em producao
// apontou 16,1 KiB desperdicados so no avatar do header, que aparece em
// TODA pagina.
//
// O proprio GitHub aceita `?s=<px>` e redimensiona no lado dele. Isso e
// melhor que passar pelo otimizador de imagem do Next aqui: nao gasta CPU
// do VPS nem adiciona um hop em /_next/image.
//
// Avatares que nao sao do GitHub (upload proprio no Supabase Storage)
// passam intactos — nao ha parametro equivalente e mexer na URL quebraria a
// assinatura.
//
// `components/quadro/avatar.tsx` NAO precisa disto: ja usa next/image com
// width/height, entao o Next redimensiona.
// ═══════════════════════════════════════════════════════════════════════

const HOST_GITHUB = "avatars.githubusercontent.com";

/**
 * URL do avatar dimensionada para `px` de exibicao.
 *
 * Pede 2x pra nao borrar em tela retina. Devolve `undefined` quando nao ha
 * avatar, pra casar com o `src` opcional do <img>.
 */
export function avatarDimensionado(
  url: string | null | undefined,
  px: number,
): string | undefined {
  if (!url) return undefined;
  if (!url.includes(HOST_GITHUB)) return url;

  try {
    const u = new URL(url);
    u.searchParams.set("s", String(px * 2));
    return u.toString();
  } catch {
    // URL malformada — melhor servir a original que quebrar o avatar.
    return url;
  }
}
