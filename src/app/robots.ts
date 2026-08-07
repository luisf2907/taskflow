import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
  const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // App autenticado — nada aqui rende busca.
          "/dashboard",
          "/quadro/",
          "/workspace/",
          "/settings",
          "/api/",
          // Transacionais: a URL carrega token de uso único ou depende de
          // sessão. Indexar não serve para nada e ainda expõe o formato do
          // link no índice de busca.
          "/convite/",
          "/reset-password",
          "/trocar-senha",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
