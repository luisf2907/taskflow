"use client";

import { useAuth } from "@/hooks/use-auth";
import { useQuadros } from "@/hooks/use-quadros";
import { useSidebar } from "@/hooks/use-sidebar";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import LandingHeader from "@/components/landing/landing-header";
import LandingFooter from "@/components/landing/landing-footer";

interface HelpLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout do Help Center que se adapta:
 * - Usuario logado: usa Header + Sidebar do app
 * - Usuario nao logado: usa LandingHeader + LandingFooter (publico)
 */
export function HelpLayout({ children }: HelpLayoutProps) {
  const { user, carregando } = useAuth();

  // Enquanto carrega, renderiza so o conteudo (evita flash)
  if (carregando) {
    return (
      <div style={{ background: "var(--tf-bg)", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  if (user) {
    return <AppLayout>{children}</AppLayout>;
  }

  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  return (
    <div className="h-full flex overflow-hidden lg:flex-row flex-col" style={{ background: "var(--tf-bg)" }}>
      {iniciado && (
        <Sidebar quadros={quadros} onNovoQuadro={() => {}} aberta={sidebarAberta} onToggle={toggleSidebar} />
      )}
      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />
        <main id="main-content" className="flex-1 overflow-y-auto pb-4 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
