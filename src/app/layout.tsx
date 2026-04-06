import { AuthListener } from "@/components/auth-listener";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineBanner } from "@/components/offline-banner";
import { SWRProvider } from "@/components/swr-provider";
import { ToastContainer } from "@/components/ui/toast";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    {/* suppressHydrationWarning necessario: theme-init.js modifica class/data-theme
        antes do React hidratar para evitar flash de tema errado (FOUC) */}
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className={`${dmSans.className} h-full antialiased`}>

        <SWRProvider>
          <ErrorBoundary>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
              style={{ background: "var(--tf-accent)", color: "#fff" }}
            >
              Pular para o conteúdo
            </a>
            <AuthListener />
            <CommandPalette />
            <OfflineBanner />
            {children}
            <ToastContainer />
          </ErrorBoundary>
        </SWRProvider>
      </body>
    </html>
  );
}
