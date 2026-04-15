import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import {
  ARTIGOS,
  getArtigoById,
  getArtigosByCategoria,
  getCategoriaById,
} from "@/lib/help-content";
import { HelpRenderer } from "@/components/help/help-renderer";
import { HelpLayout } from "@/components/help/help-layout";

export function generateStaticParams() {
  return ARTIGOS.map((a) => ({ slug: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artigo = getArtigoById(slug);
  if (!artigo) return { title: "Help — Taskflow" };
  return {
    title: `${artigo.titulo} | Central de Ajuda Taskflow`,
    description: artigo.descricao,
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artigo = getArtigoById(slug);
  if (!artigo) notFound();

  const categoria = getCategoriaById(artigo.categoria);
  const artigosCategoria = getArtigosByCategoria(artigo.categoria);
  const idxAtual = artigosCategoria.findIndex((a) => a.id === artigo.id);
  const anterior = idxAtual > 0 ? artigosCategoria[idxAtual - 1] : null;
  const proximo =
    idxAtual < artigosCategoria.length - 1
      ? artigosCategoria[idxAtual + 1]
      : null;

  return (
    <HelpLayout>
      <main className="max-w-5xl mx-auto px-6 md:px-12 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar */}
          <aside>
            <Link
              href="/help"
              className="inline-flex items-center gap-1 text-[0.6875rem] font-medium no-underline mb-4 transition-colors hover:text-[var(--tf-accent)]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <ArrowLeft size={10} strokeWidth={1.75} /> Central de ajuda
            </Link>

            <p
              className="label-mono mb-2"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              {categoria?.nome}
            </p>

            <nav className="space-y-0.5">
              {artigosCategoria.map((a) => {
                const ativo = a.id === artigo.id;
                return (
                  <Link
                    key={a.id}
                    href={`/help/${a.id}`}
                    className="block px-2.5 h-8 flex items-center text-[0.75rem] font-medium no-underline transition-colors relative"
                    style={{
                      background: ativo ? "var(--tf-accent-light)" : "transparent",
                      color: ativo ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {ativo && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full"
                        style={{ background: "var(--tf-accent)" }}
                      />
                    )}
                    {a.titulo}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Conteudo */}
          <article>
            {/* Breadcrumb */}
            <div
              className="text-[0.6875rem] mb-3 flex items-center gap-1.5"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              <Link
                href="/help"
                className="no-underline transition-colors hover:text-[var(--tf-accent)]"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                help
              </Link>
              <span style={{ color: "var(--tf-border-strong)" }}>/</span>
              <span>{categoria?.nome}</span>
            </div>

            {/* Titulo */}
            <h1
              className="text-[1.75rem] md:text-[2.25rem] font-semibold mb-2"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
              }}
            >
              {artigo.titulo}
            </h1>
            <p
              className="text-[0.9375rem] mb-5"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {artigo.descricao}
            </p>

            {/* Tags */}
            {artigo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-8">
                {artigo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center h-[20px] px-1.5 text-[0.625rem] font-medium"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      color: "var(--tf-text-tertiary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                    }}
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-10 pt-5 border-t"
              style={{ borderColor: "var(--tf-border)" }}
            >
              {anterior ? (
                <Link
                  href={`/help/${anterior.id}`}
                  className="block p-3.5 no-underline transition-colors border border-[var(--tf-border)] hover:border-[var(--tf-accent)]"
                  style={{
                    background: "var(--tf-surface)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                >
                  <div
                    className="inline-flex items-center gap-1 mb-1"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      fontSize: "0.6875rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <ChevronLeft size={11} strokeWidth={1.75} /> Anterior
                  </div>
                  <p
                    className="text-[0.8125rem] font-medium"
                    style={{
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {anterior.titulo}
                  </p>
                </Link>
              ) : (
                <div />
              )}

              {proximo && (
                <Link
                  href={`/help/${proximo.id}`}
                  className="block p-3.5 no-underline transition-colors text-right border border-[var(--tf-border)] hover:border-[var(--tf-accent)]"
                  style={{
                    background: "var(--tf-surface)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-end gap-1 mb-1"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      fontSize: "0.6875rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Próximo <ChevronRight size={11} strokeWidth={1.75} />
                  </div>
                  <p
                    className="text-[0.8125rem] font-medium"
                    style={{
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {proximo.titulo}
                  </p>
                </Link>
              )}
            </div>
          </article>
        </div>
      </main>
    </HelpLayout>
  );
}
