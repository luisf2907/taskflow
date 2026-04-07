"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ArrowRight, Sparkles, Folder, Calendar, Kanban, GitBranch, Dices, Bot, Upload, Settings, Keyboard, HelpCircle } from "lucide-react";
import { CATEGORIAS, getArtigosByCategoria, getArtigosPopulares, buscarArtigos } from "@/lib/help-content";
import { HelpLayout } from "@/components/help/help-layout";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Sparkles, Folder, Calendar, Kanban, GitBranch, Dices, Bot, Upload, Settings, Keyboard, HelpCircle,
};

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const populares = getArtigosPopulares();
  const resultadosBusca = query.trim() ? buscarArtigos(query) : [];

  return (
    <HelpLayout>
      <main className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold mb-4"
            style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}
          >
            <HelpCircle size={14} />
            Central de Ajuda
          </div>
          <h1
            className="text-[32px] md:text-[44px] font-black tracking-tight mb-3"
            style={{ color: "var(--tf-text)" }}
          >
            Como podemos te ajudar?
          </h1>
          <p
            className="text-[15px] md:text-[16px] max-w-xl mx-auto"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Encontre respostas, guias e tutoriais para tirar o maximo do TaskFlow.
          </p>

          {/* Busca */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--tf-text-tertiary)" }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por titulo, tag ou palavra-chave..."
              className="w-full pl-12 pr-4 py-4 rounded-[16px] text-[15px] outline-none border-2"
              style={{
                background: "var(--tf-surface)",
                borderColor: "var(--tf-border)",
                color: "var(--tf-text)",
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Resultados de busca OU categorias */}
        {query.trim() ? (
          <div>
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--tf-text)" }}>
              {resultadosBusca.length} resultado{resultadosBusca.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-2">
              {resultadosBusca.map((artigo) => (
                <Link
                  key={artigo.id}
                  href={`/help/${artigo.id}`}
                  className="block p-4 rounded-[12px] border transition-all hover:-translate-y-0.5 no-underline"
                  style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
                >
                  <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>
                    {artigo.titulo}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                    {artigo.descricao}
                  </p>
                </Link>
              ))}
              {resultadosBusca.length === 0 && (
                <p className="text-center py-8 text-[14px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  Nenhum artigo encontrado para &quot;{query}&quot;
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Artigos populares */}
            <div className="mb-12">
              <h2 className="text-[16px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--tf-text)" }}>
                <Sparkles size={16} style={{ color: "var(--tf-accent)" }} /> Mais lidos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {populares.map((artigo) => (
                  <Link
                    key={artigo.id}
                    href={`/help/${artigo.id}`}
                    className="block p-4 rounded-[12px] border transition-all hover:-translate-y-0.5 no-underline"
                    style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
                  >
                    <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>
                      {artigo.titulo}
                    </p>
                    <p className="text-[12px] mt-1 line-clamp-1" style={{ color: "var(--tf-text-tertiary)" }}>
                      {artigo.descricao}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categorias */}
            <div>
              <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--tf-text)" }}>
                Todas as categorias
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORIAS.map((cat) => {
                  const Icon = ICON_MAP[cat.icone] || HelpCircle;
                  const artigos = getArtigosByCategoria(cat.id);
                  return (
                    <Link
                      key={cat.id}
                      href={`/help/${artigos[0]?.id || ""}`}
                      className="block p-5 rounded-[16px] border transition-all hover:-translate-y-0.5 no-underline group"
                      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ background: "var(--tf-accent-light)" }}
                        >
                          <Icon size={20} style={{ color: "var(--tf-accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>
                            {cat.nome}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                            {artigos.length} {artigos.length === 1 ? "artigo" : "artigos"}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
                        {cat.descricao}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer CTA */}
        <div
          className="mt-16 rounded-[20px] p-8 text-center"
          style={{ background: "var(--tf-bg-secondary)" }}
        >
          <h3 className="text-[16px] font-bold mb-1" style={{ color: "var(--tf-text)" }}>
            Nao achou o que procurava?
          </h3>
          <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            Entre em contato e a gente ajuda.
          </p>
          <a
            href="mailto:contato@taskflow.app"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] text-[13px] font-bold text-white no-underline"
            style={{ background: "var(--tf-accent)" }}
          >
            Entrar em contato <ArrowRight size={14} />
          </a>
        </div>
      </main>
    </HelpLayout>
  );
}
