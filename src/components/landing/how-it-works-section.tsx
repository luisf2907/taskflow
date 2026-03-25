"use client";

const steps = [
  {
    number: 1,
    title: "Crie seu workspace",
    description:
      "Monte a estrutura do seu projeto com quadros e colunas personalizadas.",
  },
  {
    number: 2,
    title: "Adicione seu time",
    description:
      "Convide membros, conecte o GitHub e configure integrações.",
  },
  {
    number: 3,
    title: "Entregue mais rápido",
    description:
      "Gerencie sprints, acompanhe PRs e celebre cada deploy.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      style={{ backgroundColor: "var(--tf-surface)" }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-28">
        {/* Header */}
        <div className="text-center">
          <span
            className="text-[12px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--tf-accent)" }}
          >
            COMO FUNCIONA
          </span>
          <h2
            className="text-[36px] font-black tracking-tight mt-3"
            style={{ color: "var(--tf-text)" }}
          >
            Comece em minutos
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-4 mt-16 items-start">
          {steps.map((step, i) => (
            <div key={step.number} className="contents">
              {/* Step card */}
              <div className="flex-1 text-center">
                {/* Number circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-[20px] font-black mx-auto"
                  style={{
                    backgroundColor: "var(--tf-accent-yellow)",
                    color: "#1C2B29",
                  }}
                >
                  {step.number}
                </div>
                <h3
                  className="text-[17px] font-bold mt-5"
                  style={{ color: "var(--tf-text)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[14px] mt-2 max-w-[280px] mx-auto"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector line between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block flex-1 self-center h-[2px]"
                  style={{ backgroundColor: "var(--tf-border)" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
