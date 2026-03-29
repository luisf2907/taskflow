import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
  const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/quadro/", "/workspace/", "/settings", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
