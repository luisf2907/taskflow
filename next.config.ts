import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const isDev = process.env.NODE_ENV === "development";

// Extrair dominio do Supabase da env para CSP dinamico
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseHost = new URL(supabaseUrl).hostname;
const isSupabaseCloud = supabaseHost.endsWith(".supabase.co");

// CSP: permitir tanto *.supabase.co quanto self-hosted.
// Em self-hosted http (ex: http://localhost:8000), precisamos ws://
// (nao wss://) pro Realtime websocket. Cloud usa sempre wss://.
const isHttps = supabaseUrl.startsWith("https://");
const wsScheme = isHttps ? "wss" : "ws";
const supabaseConnectSrc = isSupabaseCloud
  ? "https://*.supabase.co wss://*.supabase.co"
  : `${supabaseUrl} ${wsScheme}://${supabaseHost}:*`;
const supabaseImgSrc = isSupabaseCloud
  ? "https://*.supabase.co"
  : `${supabaseUrl}`;

const nextConfig: NextConfig = {
  // Build standalone — empacota tudo que o server precisa em .next/standalone,
  // usado pelo Dockerfile.app do self-hosted. No cloud (Vercel) o build continua
  // funcionando normalmente — standalone so ajuda quem vai rodar `node server.js`.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: supabaseHost,
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src 'self' data: blob: ${supabaseImgSrc} https://avatars.githubusercontent.com https://github.com`,
              "font-src 'self' https://fonts.gstatic.com data:",
              `connect-src 'self' ${supabaseConnectSrc} https://api.github.com https://*.ingest.sentry.io${isDev ? " ws://localhost:*" : ""}`,
              // media-src: permite blob: pro preview do MediaRecorder (enrollment
              // de voz) e o host do Supabase Storage pro player de reunioes
              // (carrega audio via signed URL em /storage/v1/object/sign/...).
              `media-src 'self' blob: ${supabaseImgSrc}`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
