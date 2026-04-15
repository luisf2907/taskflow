import LandingHeader from "./landing-header";
import LandingFooter from "./landing-footer";

interface LegalLayoutProps {
  children: React.ReactNode;
  titulo: string;
  atualizado: string;
  categoria?: string;
}

export function LegalLayout({
  children,
  titulo,
  atualizado,
  categoria = "Legal",
}: LegalLayoutProps) {
  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-6 md:px-12 py-14 md:py-20">
        <div className="flex flex-col gap-2 mb-10">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5"
              style={{
                background: "var(--tf-accent)",
                borderRadius: "1px",
              }}
            />
            <p
              className="text-[0.6875rem] font-medium"
              style={{
                color: "var(--tf-accent)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {categoria}
            </p>
          </div>

          <h1
            className="text-[1.75rem] md:text-[2.5rem] font-semibold"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {titulo}
          </h1>

          <p
            className="text-[0.75rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            Atualizado em {atualizado}
          </p>
        </div>

        <div className="space-y-7 legal-content">{children}</div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function Section({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="text-[1.0625rem] font-semibold mb-3"
        style={{
          color: "var(--tf-text)",
          letterSpacing: "-0.015em",
        }}
      >
        {titulo}
      </h2>
      <div
        className="text-[0.875rem] leading-relaxed space-y-3"
        style={{
          color: "var(--tf-text-secondary)",
          letterSpacing: "-0.005em",
        }}
      >
        {children}
      </div>
    </section>
  );
}
