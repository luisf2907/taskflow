import Link from "next/link";

export const metadata = {
  title: "404 — Página não encontrada | Taskflow",
};

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
      style={{ background: "var(--tf-bg)" }}
    >
      <div className="mb-6">
        <span
          className="text-[120px] font-black leading-none tracking-tighter select-none"
          style={{ color: "var(--tf-accent)", opacity: 0.15 }}
        >
          404
        </span>
      </div>

      <h1
        className="text-2xl font-black tracking-tight mb-2"
        style={{ color: "var(--tf-text)" }}
      >
        Página não encontrada
      </h1>

      <p
        className="text-sm max-w-md mb-8"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        A página que você procura não existe ou foi movida.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 text-sm font-bold text-white rounded-[10px] transition-all hover:-translate-y-0.5"
          style={{ background: "var(--tf-accent)" }}
        >
          Ir para o Dashboard
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 text-sm font-semibold rounded-[10px] border transition-all hover:-translate-y-0.5"
          style={{ color: "var(--tf-text-secondary)", borderColor: "var(--tf-border)" }}
        >
          Página inicial
        </Link>
      </div>
    </div>
  );
}
