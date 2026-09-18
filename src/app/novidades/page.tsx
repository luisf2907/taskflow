"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ListaNovidades } from "@/components/avisos/lista-novidades";
import { useSidebar } from "@/hooks/use-sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { CHANGELOG, VERSAO_ATUAL } from "@/lib/changelog";

/**
 * Historico completo de versoes.
 *
 * O modal de primeiro login mostra so o que a pessoa ainda nao viu e some
 * quando ela fecha — depois disso nao havia como reler, nem saber qual versao
 * estava rodando. Pedido do feedback 4f506227.
 *
 * O conteudo vem do mesmo CHANGELOG que alimenta o modal, e a renderizacao do
 * mesmo ListaNovidades: publicar uma release atualiza as duas telas juntas.
 */
export default function NovidadesPage() {
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: "var(--tf-bg)" }}
    >
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <div
          className="flex-1 mb-4 overflow-hidden flex flex-col scroll-clip-lg"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xl)",
          }}
        >
          <main id="main-content" className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
              <div>
                <p
                  className="label-mono mb-1"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Você está na versão {VERSAO_ATUAL}
                </p>
                <h1
                  className="text-[1.5rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.02em" }}
                >
                  Novidades
                </h1>
                <p
                  className="text-[0.8125rem] mt-1.5"
                  style={{
                    color: "var(--tf-text-secondary)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  O que mudou em cada versão do TaskFlow, da mais recente para
                  a mais antiga.
                </p>
              </div>

              <ListaNovidades entradas={CHANGELOG} versaoAtual={VERSAO_ATUAL} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
