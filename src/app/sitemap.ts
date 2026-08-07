import type { MetadataRoute } from "next";

// ═══════════════════════════════════════════════════════════════════════════
// Sitemap — só o que é público E vale ranquear
// ═══════════════════════════════════════════════════════════════════════════
// Listava apenas `/` e `/login`. Ficavam de fora `/pricing`, `/termos`,
// `/privacidade` e `/help` — todas públicas, e a de preços com metadata
// própria escrita a capricho.
//
// Fora daqui de propósito: `/dashboard`, `/quadro/`, `/workspace/`,
// `/settings` (app autenticado, já bloqueados no robots) e as páginas
// transacionais com token na URL — `/convite/[code]`, `/reset-password`,
// `/auth/*`, `/trocar-senha`.
// ═══════════════════════════════════════════════════════════════════════════

/** Caminho e prioridade relativa. `changeFrequency` segue o ritmo real. */
const PAGINAS: Array<{
  caminho: string;
  prioridade: number;
  frequencia: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { caminho: "", prioridade: 1, frequencia: "weekly" },
  { caminho: "/pricing", prioridade: 0.8, frequencia: "monthly" },
  { caminho: "/help", prioridade: 0.6, frequencia: "weekly" },
  { caminho: "/login", prioridade: 0.4, frequencia: "monthly" },
  // Legais mudam raramente e não competem por busca, mas precisam ser
  // encontráveis.
  { caminho: "/termos", prioridade: 0.3, frequencia: "yearly" },
  { caminho: "/privacidade", prioridade: 0.3, frequencia: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
  const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;
  const agora = new Date();

  return PAGINAS.map(({ caminho, prioridade, frequencia }) => ({
    url: `${siteUrl}${caminho}`,
    lastModified: agora,
    changeFrequency: frequencia,
    priority: prioridade,
  }));
}
