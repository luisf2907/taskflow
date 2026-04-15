"use client";

const steps = [
  {
    number: "01",
    title: "Crie seu workspace",
    description:
      "Monte a estrutura do seu projeto com quadros e colunas personalizadas.",
  },
  {
    number: "02",
    title: "Adicione seu time",
    description: "Convide membros, conecte o GitHub e configure integrações.",
  },
  {
    number: "03",
    title: "Entregue mais rápido",
    description: "Gerencie sprints, acompanhe PRs e celebre cada deploy.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      style={{ backgroundColor: "var(--tf-bg-secondary)" }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-24">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-12">
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
              Como funciona
            </p>
          </div>
          <h2
            className="text-[2rem] md:text-[2.5rem] font-semibold max-w-xl"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Comece em minutos.
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex-1 p-5 transition-colors"
              style={{
                backgroundColor: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--tf-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--tf-border)";
              }}
            >
              {/* Number */}
              <span
                className="inline-block text-[2rem] font-semibold mb-3"
                style={{
                  color: "var(--tf-accent)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {step.number}
              </span>
              <h3
                className="text-[1.0625rem] font-semibold mb-2"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.015em",
                }}
              >
                {step.title}
              </h3>
              <p
                className="text-[0.8125rem] leading-relaxed"
                style={{
                  color: "var(--tf-text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
