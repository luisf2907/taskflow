import LandingHeader from "./landing-header";
import LandingFooter from "./landing-footer";

interface LegalLayoutProps {
  children: React.ReactNode;
  titulo: string;
  atualizado: string;
}

export function LegalLayout({ children, titulo, atualizado }: LegalLayoutProps) {
  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <h1
          className="text-[28px] md:text-[36px] font-black tracking-tight mb-2"
          style={{ color: "var(--tf-text)" }}
        >
          {titulo}
        </h1>
        <p className="text-[13px] mb-10" style={{ color: "var(--tf-text-tertiary)" }}>
          Atualizado em {atualizado}
        </p>

        <div className="space-y-8 legal-content">
          {children}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-[18px] font-bold tracking-tight mb-3"
        style={{ color: "var(--tf-text)" }}
      >
        {titulo}
      </h2>
      <div
        className="text-[14px] leading-relaxed space-y-3"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        {children}
      </div>
    </section>
  );
}
