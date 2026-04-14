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
    <div className="sticky top-0 z-50 px-3 lg:px-6 pt-3.5">
      <header
        className="max-w-7xl mx-auto h-[64px] px-6 md:px-8 rounded-[32px] flex items-center justify-between relative transition-all duration-300"
        style={{
          background: scrolled ? "rgba(var(--tf-header-rgb), 0.85)" : "rgba(var(--tf-header-rgb), 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: scrolled ? "1px solid var(--tf-border)" : "1px solid transparent",
          boxShadow: scrolled ? "var(--tf-shadow-md)" : "none",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{ background: "var(--tf-accent)" }}
          >
            <Kanban size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-[17px] font-bold tracking-tight"
            style={{ color: "var(--tf-text)" }}
          >
            Taskflow
          </span>
        </Link>

        {/* Desktop nav — centered absolutely in header */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {[
            { label: "Funcionalidades", href: "/#features" },
            { label: "Como Funciona", href: "/#how-it-works" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-[14px] text-[13px] font-bold no-underline transition-all hover-surface"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-[14px] text-[13px] font-bold no-underline transition-all hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Precos
          </Link>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={alternar}
            className="w-[38px] h-[38px] rounded-[14px] flex items-center justify-center hover-accent-text transition-all"
            style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
            aria-label={tema === "claro" ? "Modo escuro" : "Modo claro"}
          >
            {tema === "claro" ? <Moon size={16} strokeWidth={2.5} /> : <Sun size={16} strokeWidth={2.5} />}
          </button>

          <Link
            href="/login"
            className="px-4 py-2 rounded-[14px] text-[13px] font-bold no-underline transition-all hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Login
          </Link>

          <Link
            href="/login"
            className="text-[13px] font-bold no-underline transition-all hover:-translate-y-0.5 flex items-center gap-2"
            style={{
              backgroundColor: "var(--tf-accent)",
              color: "#FFFFFF",
              borderRadius: "20px",
              padding: "9px 20px",
            }}
          >
            Comece Grátis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={alternar}
            className="w-[38px] h-[38px] rounded-[14px] flex items-center justify-center"
            style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
            aria-label={tema === "claro" ? "Modo escuro" : "Modo claro"}
          >
            {tema === "claro" ? <Moon size={16} strokeWidth={2.5} /> : <Sun size={16} strokeWidth={2.5} />}
          </button>
          <button
            className="w-[38px] h-[38px] rounded-[14px] flex items-center justify-center hover-surface"
            style={{ color: "var(--tf-text)" }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden mt-2 mx-auto max-w-6xl rounded-[20px] p-4 flex flex-col gap-2 border"
          style={{
            background: "var(--tf-surface)",
            borderColor: "var(--tf-border)",
            animation: "dropdownExpandDown 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <Link
            href="/#features"
            className="px-4 py-3 rounded-[14px] text-[14px] font-bold no-underline hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
            onClick={() => setMobileOpen(false)}
          >
            Funcionalidades
          </Link>
          <Link
            href="/#how-it-works"
            className="px-4 py-3 rounded-[14px] text-[14px] font-bold no-underline hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
            onClick={() => setMobileOpen(false)}
          >
            Como Funciona
          </Link>
          <Link
            href="/pricing"
            className="px-4 py-3 rounded-[14px] text-[14px] font-bold no-underline hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
            onClick={() => setMobileOpen(false)}
          >
            Precos
          </Link>
          <div className="h-[1px] my-1" style={{ background: "var(--tf-border)" }} />
          <Link
            href="/login"
            className="px-4 py-3 rounded-[14px] text-[14px] font-bold no-underline hover-surface"
            style={{ color: "var(--tf-text-secondary)" }}
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/login"
            className="px-4 py-3 rounded-[20px] text-[14px] font-bold no-underline text-center transition-all"
            style={{
              backgroundColor: "var(--tf-accent)",
              color: "#FFFFFF",
            }}
            onClick={() => setMobileOpen(false)}
          >
            Comece Grátis
          </Link>
        </div>
      )}
    </div>
  );
}
