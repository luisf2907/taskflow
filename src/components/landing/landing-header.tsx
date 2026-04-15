"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Kanban, Menu, X, Moon, Sun } from "lucide-react";
import { useTema } from "@/hooks/use-tema";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tema, alternar } = useTema();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 px-3 lg:px-6 pt-3">
      <header
        className="max-w-7xl mx-auto h-12 px-4 md:px-5 flex items-center justify-between relative transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(var(--tf-header-rgb), 0.88)"
            : "rgba(var(--tf-header-rgb), 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: scrolled
            ? "1px solid var(--tf-border)"
            : "1px solid transparent",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div
            className="w-7 h-7 flex items-center justify-center shrink-0"
            style={{
              background: "var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Kanban size={14} className="text-white" strokeWidth={1.75} />
          </div>
          <span
            className="text-[0.9375rem] font-semibold"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.015em",
            }}
          >
            Taskflow
          </span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {[
            { label: "Funcionalidades", href: "/#features" },
            { label: "Como funciona", href: "/#how-it-works" },
            { label: "Preços", href: "/pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="h-8 px-3 inline-flex items-center text-[0.75rem] font-medium no-underline transition-colors hover:text-[var(--tf-text)]"
              style={{
                color: "var(--tf-text-tertiary)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={alternar}
            className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[var(--tf-surface-hover)]"
            style={{
              color: "var(--tf-text-secondary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            aria-label={tema === "claro" ? "Modo escuro" : "Modo claro"}
          >
            {tema === "claro" ? (
              <Moon size={14} strokeWidth={1.75} />
            ) : (
              <Sun size={14} strokeWidth={1.75} />
            )}
          </button>

          <Link
            href="/login"
            className="h-8 px-3 inline-flex items-center text-[0.75rem] font-medium no-underline transition-colors hover:text-[var(--tf-text)]"
            style={{
              color: "var(--tf-text-secondary)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Entrar
          </Link>

          <Link
            href="/login"
            className="h-8 px-3.5 inline-flex items-center gap-1.5 text-[0.75rem] font-medium no-underline transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent)",
              color: "#FFFFFF",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={alternar}
            className="w-8 h-8 flex items-center justify-center"
            style={{
              color: "var(--tf-text-secondary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            aria-label={tema === "claro" ? "Modo escuro" : "Modo claro"}
          >
            {tema === "claro" ? (
              <Moon size={14} strokeWidth={1.75} />
            ) : (
              <Sun size={14} strokeWidth={1.75} />
            )}
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[var(--tf-surface-hover)]"
            style={{
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X size={16} strokeWidth={1.75} />
            ) : (
              <Menu size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden mt-2 mx-auto max-w-6xl p-2 flex flex-col gap-0.5"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
            animation: "dropdownExpandDown 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {[
            { label: "Funcionalidades", href: "/#features" },
            { label: "Como funciona", href: "/#how-it-works" },
            { label: "Preços", href: "/pricing" },
            { label: "Entrar", href: "/login" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="h-9 px-3 inline-flex items-center text-[0.8125rem] font-medium no-underline transition-colors hover:bg-[var(--tf-surface-hover)]"
              style={{
                color: "var(--tf-text-secondary)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div
            className="h-px my-1"
            style={{ background: "var(--tf-border)" }}
          />
          <Link
            href="/login"
            className="h-9 px-3 inline-flex items-center justify-center text-[0.8125rem] font-medium no-underline transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent)",
              color: "#FFFFFF",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
            onClick={() => setMobileOpen(false)}
          >
            Começar grátis
          </Link>
        </div>
      )}
    </div>
  );
}
