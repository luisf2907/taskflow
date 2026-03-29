import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
  const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
