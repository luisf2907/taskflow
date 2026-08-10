import { AuthListener } from "@/components/auth-listener";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { GlobalOverlays } from "@/components/global-overlays";
import { OfflineBanner } from "@/components/offline-banner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { RecordingIndicator } from "@/components/layout/recording-indicator";
import { GlobalSprintModal } from "@/components/global-sprint-modal";
import { SWRProvider } from "@/components/swr-provider";
import { ThemeInjector } from "@/components/theme-injector";
import { ToastContainer } from "@/components/ui/toast";
import { UserVariantInjector } from "@/components/user-variant-injector";
import { RecordingProvider } from "@/hooks/use-recording";
import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { readFileSync } from "fs";
import path from "path";
import "./globals.css";

// Lê o conteúdo do theme-init.js em build-time pra injetar inline no <head>.
// Script inline com dangerouslySetInnerHTML roda antes da hidratação (evita
// FOUC de tema) sem disparar o warning @next/next/no-sync-scripts e sem o bug
// do next/script beforeInteractive inside <head> com React 19.
const themeInitScript = readFileSync(
  path.join(process.cwd(), "public", "theme-init.js"),
  "utf8",
);

// Geist — display + body (tech-futurista sóbrio)
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// JetBrains Mono — números, metadados, labels, código
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

/**
 * Origem do Supabase pra `preconnect`.
 *
 * O Lighthouse em producao foi literal: "nenhuma origem foi pre-conectada".
 * Hoje o browser so inicia DNS + TCP + TLS ate o Supabase DEPOIS de baixar e
 * hidratar o JS, e sao ~8 requests pra la (etiquetas, membros, perfis,
 * notificacoes, views salvas, quadros, workspaces...). O preconnect sobrepoe
 * esse handshake ao download do JS.
 *
 * Deriva da env em vez de hardcoded: em self-hosted o host e outro.
 */
function getSupabaseOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = getSupabaseOrigin();
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Taskflow",
    template: "%s | Taskflow",
  },
  description:
    "Gerencie seus projetos com quadros kanban, sprints e integração com GitHub.",
  applicationName: "Taskflow",
  keywords: ["kanban", "sprints", "gestão de tarefas", "github", "scrum", "agile"],
  authors: [{ name: "Taskflow" }],
  creator: "Taskflow",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Taskflow",
    title: "Taskflow — Gestão de tarefas para times que entregam",
    description:
      "Quadros kanban, sprints, planning poker, wiki e integração com GitHub. Para times de dev.",
    // og image auto-discovered via src/app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow",
    description: "Gestão de tarefas para times que entregam.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // icons auto-discovered via src/app/icon.tsx e apple-icon.tsx
};

// ═══════════════════════════════════════════════════════════════════════════
// Viewport — o que faz o safe-area existir
// ═══════════════════════════════════════════════════════════════════════════
// `viewportFit: "cover"` NAO e detalhe. Sem ele o iOS nao estende o layout
// sob a Dynamic Island e a home indicator, e — o que importa aqui —
// `env(safe-area-inset-*)` resolve para ZERO. Ou seja: o
// `paddingBottom: env(safe-area-inset-bottom)` do bottom-nav e o
// `calc(56px + env(...))` do globals.css ja estavam escritos, mas nunca
// valeram nada no iPhone. A barra encostava na home indicator.
//
// `themeColor` pinta a UI do navegador (barra de status no iOS, barra de
// endereco no Chrome Android) com o fundo do app. Sem isso o topo da tela
// fica branco por cima de uma interface dark-first. Os dois valores sao os
// mesmos `--tf-bg` de globals.css, um por esquema.
//
// `colorScheme` avisa o navegador para desenhar controles nativos (scrollbar,
// caixa de selecao de data, autofill) no tema certo.
// `interactiveWidget: "resizes-content"` trata o teclado virtual. O padrao
// dos navegadores e "resizes-visual": o teclado sobe POR CIMA sem encolher o
// viewport de layout, entao `100dvh` continua valendo a tela inteira e todo
// elemento ancorado embaixo — campo de chat, barra de navegacao — fica
// escondido atras do teclado. Com "resizes-content" o viewport encolhe de
// verdade e o `dvh` passa a significar "o que da para ver".
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: theme-init.js modifica class/data-theme
  // antes do React hidratar para evitar flash de tema errado (FOUC)
  return (
    <html
      lang="pt-BR"
      className={`h-full ${geistSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Handshake com o Supabase começa junto com o download do JS, em vez
            de só depois da hidratação. Ver getSupabaseOrigin acima. */}
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        {/* theme-init inline — roda antes da hidratação pra aplicar dark mode
            e palette customizada (evita FOUC). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Umami analytics — so carrega se as envs estiverem setadas (prod).
            Em dev (sem as envs), nao traqueia nada. */}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID &&
          process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && (
            <script
              defer
              src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            />
          )}
      </head>
      <body className="h-full antialiased" suppressHydrationWarning>

        <SWRProvider>
          <ErrorBoundary>
            <RecordingProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
                style={{ background: "var(--tf-accent)", color: "#fff" }}
              >
                Pular para o conteúdo
              </a>
              <AuthListener />
              <ThemeInjector />
              <UserVariantInjector />
              <GlobalOverlays />
              <GlobalKeyboardShortcuts />
              <OfflineBanner />
              {children}
              <BottomNav />
              <GlobalSprintModal />
              <RecordingIndicator />
              <ToastContainer />
            </RecordingProvider>
          </ErrorBoundary>
        </SWRProvider>
      </body>
    </html>
  );
}
