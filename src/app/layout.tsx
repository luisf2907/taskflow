import { AuthListener } from "@/components/auth-listener";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { HelpModal } from "@/components/help/help-modal";
import { OfflineBanner } from "@/components/offline-banner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { RecordingIndicator } from "@/components/layout/recording-indicator";
import { SWRProvider } from "@/components/swr-provider";
import { ThemeInjector } from "@/components/theme-injector";
import { ToastContainer } from "@/components/ui/toast";
import { UserVariantInjector } from "@/components/user-variant-injector";
import { RecordingProvider } from "@/hooks/use-recording";
import type { Metadata } from "next";
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
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Taskflow",
    template: "%s | Taskflow",
  },
  description: "Gerencie seus projetos com quadros kanban, sprints e integração com GitHub.",
  twitter: {
    card: "summary_large_image",
    title: "Taskflow",
    description: "Gestão de tarefas para times que entregam.",
  },
  // icons auto-discovered via src/app/icon.tsx e apple-icon.tsx
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
        {/* theme-init inline — roda antes da hidratação pra aplicar dark mode
            e palette customizada (evita FOUC). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
              <CommandPalette />
              <HelpModal />
              <OfflineBanner />
              {children}
              <BottomNav />
              <RecordingIndicator />
              <ToastContainer />
            </RecordingProvider>
          </ErrorBoundary>
        </SWRProvider>
      </body>
    </html>
  );
}
