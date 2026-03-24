import { AuthListener } from "@/components/auth-listener";
import { CommandPalette } from "@/components/command-palette";
import { SWRProvider } from "@/components/swr-provider";
import { ToastContainer } from "@/components/ui/toast";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Taskflow",
  description: "Gerencie seus projetos com quadros kanban",
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
          <AuthListener />
          <CommandPalette />
          {children}
          <ToastContainer />
        </SWRProvider>
      </body>
    </html>
  );
}
