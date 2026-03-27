"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTema } from "@/hooks/use-tema";
import { LogOut, Menu, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Header({ onMenuMobile }: { onMenuMobile?: () => void } = {}) {
  const { tema, alternar } = useTema();
  const { user, perfil, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent), []);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const avatar = perfil?.avatar_url;
  const nome = perfil?.nome ?? user?.email?.split("@")[0] ?? "";
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown on route change
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Keyboard navigation inside dropdown
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setMenuAberto(false);
      return;
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();

    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;

    const current = document.activeElement as HTMLElement;
    const idx = Array.from(items).indexOf(current);

    if (e.key === "ArrowDown") {
      items[idx < items.length - 1 ? idx + 1 : 0]?.focus();
    } else {
      items[idx > 0 ? idx - 1 : items.length - 1]?.focus();
    }
  }, []);

  return (
    <header
      className="h-[68px] mt-3.5 px-4 md:px-12 xl:pl-12 xl:pr-10 rounded-[32px] flex items-center justify-between shrink-0 mb-3 z-30 relative"
      style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
    >
      {/* Mobile menu button */}
      {onMenuMobile && (
        <button
          onClick={onMenuMobile}
          className="lg:hidden p-2 rounded-[14px] mr-2 hover:bg-[var(--tf-surface-hover)]"
          style={{ color: "var(--tf-text-tertiary)" }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Left side: Search bar */}
      <div className="hidden sm:block flex-1 max-w-sm">
        <div className="relative flex items-center w-full h-[44px] rounded-[20px] px-4 transition-colors" style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent" }}>
          <svg className="w-[18px] h-[18px] mr-2 transition-colors" style={{ color: "var(--tf-text-tertiary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar tarefa..."
            className="bg-transparent border-none outline-none w-full text-[14px] font-bold placeholder:font-bold transition-colors cursor-pointer"
            style={{ color: "var(--tf-text)" }}
            readOnly
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            onFocus={() => window.dispatchEvent(new Event("open-command-palette"))}
          />
          <span className="text-[11px] font-black px-2 py-1 rounded-[14px] ml-2 tracking-widest uppercase whitespace-nowrap" style={{ background: "var(--tf-surface)", color: "var(--tf-text-secondary)" }}>
            {isMac ? "⌘K" : "Ctrl+K"}
          </span>
        </div>
      </div>

      {/* Mobile: search icon only */}
      <button
        className="sm:hidden w-[42px] h-[42px] rounded-[20px] flex items-center justify-center hover-surface"
        style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
        aria-label="Buscar tarefa"
        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      >
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Right side: Tools & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        {user && <NotificationBell />}

        {/* Toggle Theme */}
        <button
          onClick={alternar}
          className="w-[42px] h-[42px] rounded-[20px] flex items-center justify-center transition-all hover:-translate-y-0.5 hover-accent-text"
          style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
          aria-label={tema === "claro" ? "Alternar para modo escuro" : "Alternar para modo claro"}
          title={tema === "claro" ? "Modo escuro" : "Modo claro"}
        >
          {tema === "claro" ? <Moon size={18} strokeWidth={2.5} /> : <Sun size={18} strokeWidth={2.5} />}
        </button>

        {/* Profile Pill */}
        {user && (
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              aria-label="Menu do perfil"
              aria-expanded={menuAberto}
              aria-haspopup="true"
              className="flex items-center gap-2.5 pr-3 sm:pr-5 pl-2 py-2 rounded-[20px] transition-all hover:-translate-y-0.5 border"
              style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)" }}
            >
              {avatar ? (
                <img src={avatar} alt={nome} className="w-8 h-8 rounded-[14px] shrink-0" />
              ) : (
                <div
                  className="w-8 h-8 rounded-[14px] flex items-center justify-center text-[12px] font-black shrink-0"
                  style={{ background: "var(--tf-accent)", color: "white" }}
                >
                  {iniciais || <User size={14} strokeWidth={2.5} />}
                </div>
              )}
              <span className="hidden sm:inline text-[14px] font-bold tracking-tight" style={{ color: "var(--tf-text)" }}>
                {nome || "Conta"}
              </span>
              <svg className="w-3.5 h-3.5 ml-1 transition-transform" style={{ color: "var(--tf-text-tertiary)", transform: menuAberto ? "rotate(180deg)" : "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                <div
                  ref={menuRef}
                  role="menu"
                  onKeyDown={handleMenuKeyDown}
                  className="absolute top-[calc(100%+12px)] left-1/2 z-50 w-56 rounded-[20px] p-2.5 origin-top border"
                  style={{
                    marginLeft: "-112px",
                    background: "var(--tf-surface)",
                    borderColor: "var(--tf-border)",
                    animation: "dropdownExpandDown 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
                  }}
                >
                  <div className="px-4 py-3 mb-2.5 rounded-[14px]" style={{ background: "var(--tf-bg)" }}>
                    <p className="text-[15px] font-bold tracking-tight truncate" style={{ color: "var(--tf-text)" }}>{nome}</p>
                    <p className="text-[12px] font-medium truncate mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>{user.email}</p>
                  </div>

                  <Link
                    href="/settings"
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-bold hover-menu-item"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    <User size={15} /> Configurações
                  </Link>

                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-[14px] text-[13px] font-bold hover-danger-bg mt-1"
                    style={{ color: "var(--tf-danger)" }}
                  >
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
