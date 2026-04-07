import LandingHeader from "@/components/landing/landing-header";
import LandingFooter from "@/components/landing/landing-footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { ARTIGOS, getArtigoById, getArtigosByCategoria, getCategoriaById } from "@/lib/help-content";
import { HelpRenderer } from "@/components/help/help-renderer";

export function generateStaticParams() {
  return ARTIGOS.map((a) => ({ slug: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artigo = getArtigoById(slug);
  if (!artigo) return { title: "Help — Taskflow" };
  return {
    title: `${artigo.titulo} | Central de Ajuda Taskflow`,
    description: artigo.descricao,
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artigo = getArtigoById(slug);
  if (!artigo) notFound();

  const categoria = getCategoriaById(artigo.categoria);
  const artigosCategoria = getArtigosByCategoria(artigo.categoria);
  const idxAtual = artigosCategoria.findIndex((a) => a.id === artigo.id);
  const anterior = idxAtual > 0 ? artigosCategoria[idxAtual - 1] : null;
  const proximo = idxAtual < artigosCategoria.length - 1 ? artigosCategoria[idxAtual + 1] : null;

  return (
    <div style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <aside>
            <Link
              href="/help"
              className="flex items-center gap-1 text-[12px] font-bold no-underline mb-4"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <ArrowLeft size={12} /> Central de Ajuda
            </Link>

            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
              {categoria?.nome}
            </p>

            <nav className="space-y-0.5">
              {artigosCategoria.map((a) => (
                <Link
                  key={a.id}
                  href={`/help/${a.id}`}
                  className="block px-3 py-2 rounded-[8px] text-[12px] font-medium no-underline transition-all"
                  style={{
                    background: a.id === artigo.id ? "var(--tf-accent-light)" : "transparent",
                    color: a.id === artigo.id ? "var(--tf-accent)" : "var(--tf-text-secondary)",
                  }}
                >
                  {a.titulo}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Conteudo */}
          <article>
            {/* Breadcrumb */}
            <div className="text-[12px] mb-3" style={{ color: "var(--tf-text-tertiary)" }}>
              <Link href="/help" className="no-underline" style={{ color: "var(--tf-text-tertiary)" }}>
                Help
              </Link>
              {" / "}
              <span>{categoria?.nome}</span>
            </div>

            {/* Titulo */}
            <h1
              className="text-[28px] md:text-[36px] font-black tracking-tight mb-2"
              style={{ color: "var(--tf-text)" }}
            >
              {artigo.titulo}
            </h1>
            <p className="text-[15px] mb-6" style={{ color: "var(--tf-text-secondary)" }}>
              {artigo.descricao}
            </p>

            {/* Tags */}
            {artigo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-8">
                {artigo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Conteudo renderizado */}
            <HelpRenderer blocos={artigo.conteudo} />

            {/* Navegacao prev/next */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 pt-6 border-t"
              style={{ borderColor: "var(--tf-border)" }}
            >
              {anterior ? (
                <Link
                  href={`/help/${anterior.id}`}
                  className="block p-4 rounded-[12px] border no-underline transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
                    <ChevronLeft size={12} /> Anterior
                  </div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>
                    {anterior.titulo}
                  </p>
                </Link>
              ) : <div />}

              {proximo && (
                <Link
                  href={`/help/${proximo.id}`}
                  className="block p-4 rounded-[12px] border no-underline transition-all hover:-translate-y-0.5 text-right"
                  style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
                >
                  <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase mb-1" style={{ color: "var(--tf-text-tertiary)" }}>
                    Proximo <ChevronRight size={12} />
                  </div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>
                    {proximo.titulo}
                  </p>
                </Link>
              )}
            </div>
          </article>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
