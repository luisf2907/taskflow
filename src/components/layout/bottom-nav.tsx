"use client";

import { cn } from "@/lib/utils";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useIsTabletOrBelow } from "@/hooks/use-is-mobile";
import { LayoutDashboard, Kanban, BookOpen, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: (pathname: string) => boolean;
}

const ROTAS_PUBLICAS = ["/", "/login", "/signup", "/pricing", "/forgot-password", "/reset-password"];

function isRotaPublica(pathname: string): boolean {
  if (ROTAS_PUBLICAS.includes(pathname)) return true;
  if (pathname.startsWith("/help")) return true;
  return false;
}

export function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsTabletOrBelow();
  const { activeWorkspaceId } = useActiveWorkspace();

  if (!isMobile) return null;
  if (isRotaPublica(pathname)) return null;

  const itens: BottomNavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Início",
      active: (p) => p === "/dashboard",
    },
    {
      href: activeWorkspaceId ? `/workspace/${activeWorkspaceId}` : "/dashboard",
      icon: Kanban,
      label: "Workspace",
      active: (p) =>
        (p.startsWith("/workspace/") || p.startsWith("/quadro/")) && !p.includes("/wiki"),
    },
    {
      href: activeWorkspaceId
        ? `/workspace/${activeWorkspaceId}/wiki`
        : "/dashboard",
      icon: BookOpen,
      label: "Wiki",
      active: (p) => p.includes("/wiki"),
    },
    {
      href: "/settings",
      icon: User,
      label: "Perfil",
      active: (p) => p.startsWith("/settings"),
    },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around lg:hidden"
      style={{
        background: "var(--tf-surface)",
        borderTop: "1px solid var(--tf-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {itens.map((item) => {
        const ativo = item.active(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-2 transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-accent)] rounded-[var(--tf-radius-xs)]"
            )}
            style={{
              color: ativo ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
            }}
          >
            <Icon size={20} strokeWidth={ativo ? 2.25 : 1.75} />
            <span
              className="text-[0.625rem] font-medium"
              style={{
                letterSpacing: "0.02em",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Spacer para compensar o bottom-nav fixo e evitar que conteúdo fique
 * por baixo dele. Use no final de páginas que exibem o bottom-nav.
 */
export function BottomNavSpacer() {
  const isMobile = useIsTabletOrBelow();
  if (!isMobile) return null;
  return <div aria-hidden className="h-[56px] shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />;
}
