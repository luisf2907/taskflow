import Link from "next/link";

export const metadata = {
  title: "404 — Página não encontrada | Taskflow",
};

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center hero-grid relative"
      style={{ background: "var(--tf-bg)" }}
    >
      <div className="relative z-10 flex flex-col items-center">
        {/* Big 404 */}
        <span
          className="text-[8rem] md:text-[10rem] font-semibold leading-none select-none mb-4"
          style={{
            color: "var(--tf-accent)",
            opacity: 0.12,
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "-0.04em",
          }}
        >
          404
        </span>

        <p
          className="label-mono mb-2"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Erro · Rota não encontrada
        </p>

        <h1
          className="text-[1.5rem] md:text-[1.75rem] font-semibold mb-2"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.02em",
          }}
        >
          Página não encontrada
        </h1>

        <p
          className="text-[0.875rem] max-w-md mb-8"
          style={{
            color: "var(--tf-text-secondary)",
            letterSpacing: "-0.005em",
          }}
        >
          A página que você procura não existe ou foi movida.
        </p>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center h-9 px-3.5 text-[0.8125rem] font-medium text-white no-underline transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Ir para o dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center h-9 px-3.5 text-[0.8125rem] font-medium no-underline transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
            style={{
              color: "var(--tf-text-secondary)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
