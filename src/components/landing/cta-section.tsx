"use client";

import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-12 py-20">
      <div
        className="rounded-[32px] px-8 md:px-16 py-16 md:py-20 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--tf-accent), var(--tf-accent-hover))",
        }}
      >
        <h2 className="text-[32px] md:text-[40px] font-black tracking-tight text-white max-w-2xl mx-auto">
          Pronto para transformar a produtividade do seu time?
        </h2>
        <p className="text-[16px] text-white/80 mt-4">
          Comece grátis, sem cartão de crédito. Upgrade quando quiser.
        </p>
        <Link
          href="/login"
          className="inline-block px-10 py-4 rounded-[20px] text-[16px] font-bold no-underline mt-8 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            backgroundColor: "#FFFFFF",
            color: "var(--tf-accent)",
          }}
        >
          Comece Grátis Agora
        </Link>
      </div>
    </section>
  );
}
