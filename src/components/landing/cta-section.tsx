"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-12 py-16">
      <div
        className="relative overflow-hidden px-8 md:px-14 py-14 md:py-16 text-center"
        style={{
          background: "var(--tf-accent)",
          border: "1px solid var(--tf-accent)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse at center, black 50%, transparent 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 50%, transparent 95%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <p
            className="text-[0.6875rem] font-medium"
            style={{
              color: "rgba(255,255,255,0.8)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Começar agora
          </p>
          <h2
            className="text-[2rem] md:text-[2.75rem] font-semibold text-white max-w-2xl mx-auto"
            style={{
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Pronto para transformar a produtividade do seu time?
          </h2>
          <p
            className="text-[0.9375rem] max-w-lg mx-auto"
            style={{
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "-0.005em",
            }}
          >
            Comece grátis, sem cartão de crédito. Upgrade quando quiser.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 h-11 px-5 text-[0.875rem] font-medium no-underline mt-2 transition-colors hover:opacity-95"
            style={{
              backgroundColor: "#FFFFFF",
              color: "var(--tf-accent)",
              border: "1px solid #FFFFFF",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Começar grátis agora
            <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </section>
  );
}
