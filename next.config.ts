import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Extrair dominio do Supabase da env para CSP dinamico
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseHost = new URL(supabaseUrl).hostname;
const isSupabaseCloud = supabaseHost.endsWith(".supabase.co");

// CSP: permitir tanto *.supabase.co quanto self-hosted
const supabaseConnectSrc = isSupabaseCloud
  ? "https://*.supabase.co wss://*.supabase.co"
  : `${supabaseUrl} wss://${supabaseHost}`;
const supabaseImgSrc = isSupabaseCloud
  ? "https://*.supabase.co"
  : `${supabaseUrl}`;

const nextConfig: NextConfig = {
  experimental: {
    sri: {
      algorithm: "sha256",
    },
  },
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
              `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${supabaseImgSrc} https://avatars.githubusercontent.com https://github.com`,
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${supabaseConnectSrc} https://api.github.com${isDev ? " ws://localhost:*" : ""}`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
