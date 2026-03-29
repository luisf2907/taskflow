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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://taskflow.app";

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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('tema') === 'escuro' || (!localStorage.getItem('tema') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${dmSans.className} h-full antialiased`}
      >
        <SWRProvider>
          <ErrorBoundary>
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
