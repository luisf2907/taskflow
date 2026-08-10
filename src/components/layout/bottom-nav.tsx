"use client";

import { cn } from "@/lib/utils";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useIsTabletOrBelow } from "@/hooks/use-is-mobile";
import { LayoutDashboard, Kanban, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: (pathname: string) => boolean;
}

const ROTAS_PUBLICAS = ["/", "/login", "/signup", "/pricing", "/forgot-password", "/reset-password"];

function isRotaPublica(pathname: string): boolean {
  if (ROTAS_PUBLICAS.includes(pathname)) return true;
  if (pathname.startsWith("/help")) return true;
  return false;
}

export function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsTabletOrBelow();
  const { activeWorkspaceId } = useActiveWorkspace();

  if (!isMobile) return null;
  if (isRotaPublica(pathname)) return null;

  const itens: BottomNavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Início",
      active: (p) => p === "/dashboard",
    },
    {
      href: activeWorkspaceId ? `/workspace/${activeWorkspaceId}` : "/dashboard",
      icon: Kanban,
      label: "Workspace",
      active: (p) =>
        (p.startsWith("/workspace/") || p.startsWith("/quadro/")) && !p.includes("/wiki"),
    },
    {
      href: activeWorkspaceId
        ? `/workspace/${activeWorkspaceId}/wiki`
        : "/dashboard",
      icon: BookOpen,
      label: "Wiki",
      active: (p) => p.includes("/wiki"),
    },
    // Perfil NAO entra aqui. A barra de abas e para DESTINOS de navegacao
    // frequente; conta/configuracoes e o classico "canto da conta", e ja
    // esta no avatar do header (Dropdown -> Configuracoes). Duplicar gastava
    // 1/4 da largura da capsula com o item menos usado — que e justamente o
    // que espremia os outros tres.
  ];

  return (
    // ═══════════════════════════════════════════════════════════════════
    // Capsula flutuante — iOS 26 / One UI 8.5
    // ═══════════════════════════════════════════════════════════════════
    // A primeira versao errou o alvo: usei --tf-radius-md (6px), que e raio
    // de CARD, num objeto que deveria flutuar. Com 6px e 8px de folga o
    // resultado nao era nem a barra antiga nem a nova — lia como um
    // retangulo que nao alcancou as bordas.
    //
    // A regra dos "radii reduzidos" do design system vale para superficie
    // de CONTEUDO: card, input, botao. Um elemento que paira sobre a pagina
    // e outra classe de objeto, e as referencias tratam assim. A identidade
    // aqui continua na tipografia mono do rotulo, no laranja e na
    // densidade — nao no raio.
    //
    // O material segue SOLIDO, sem vidro. Translucidez faria o contraste do
    // rotulo variar conforme o conteudo passa por baixo, e a barra tem que
    // ser legivel em cima de qualquer coisa.
    <>
      {/* Degrade que dissolve o conteudo ao chegar na barra. Ver
          .tf-borda-rolagem em globals.css. */}
      <div aria-hidden className="tf-borda-rolagem lg:hidden" />
      <div
        className="fixed inset-x-4 z-40 flex items-stretch gap-2 lg:hidden"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
      <nav
        aria-label="Navegação principal"
        className="flex-1 min-w-0 flex items-stretch gap-1 p-1.5"
        style={{
          // Altura EXPLICITA, nao derivada do conteudo: a ilha de busca ao
          // lado le o mesmo token como largura para ficar redonda. Ver
          // --tf-nav-capsula em globals.css.
          height: "var(--tf-nav-capsula)",
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          // Capsula. O unico raio do app que nao vem dos tokens, de
          // proposito: --tf-radius-xl (14px) num objeto de 60px de altura
          // ainda leria como retangulo arredondado, nao como capsula.
          borderRadius: "999px",
          boxShadow: "var(--tf-shadow-lg)",
        }}
      >
        {itens.map((item) => {
          const ativo = item.active(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 rounded-full",
                "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-accent)] focus-visible:ring-offset-0"
              )}
              style={
                // Aba ativa = pastilha PREENCHIDA, como nas duas
                // referencias. A marcacao e forma + cor, nao so cor: cor
                // sozinha nao satisfaz o WCAG 1.4.1.
                //
                // O preenchimento e --tf-accent com --tf-on-accent por
                // cima, os mesmos do botao primario — 5,48:1 no claro e
                // 5,91:1 no escuro. Tentei --tf-accent-light primeiro e
                // medi 1,18:1 contra a superficie da barra: a pastilha
                // sumia.
                ativo
                  ? {
                      background: "var(--tf-accent)",
                      color: "var(--tf-on-accent)",
                    }
                  : { color: "var(--tf-text-tertiary)" }
              }
            >
              <Icon size={19} strokeWidth={ativo ? 2.25 : 1.75} />
              <span
                className="max-w-full truncate text-[0.5625rem] font-medium leading-none"
                style={{
                  letterSpacing: "0.02em",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          ILHA DE BUSCA — separada da capsula, de proposito
          ═══════════════════════════════════════════════════════════════
          O iOS 26 tirou a busca da barra de abas e a pos numa ilha propria
          ao lado. Faz sentido: buscar nao e "mais um destino", e uma acao —
          misturar as duas coisas na mesma fileira confunde o que a barra
          significa. E aqui ela sai do canto superior direito do header, o
          ponto mais dificil de alcancar com o polegar, para o inferior
          direito, o mais facil.
          ═══════════════════════════════════════════════════════════════ */}
      <button
        type="button"
        aria-label="Buscar ou executar"
        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
        className="shrink-0 grid place-items-center transition-colors"
        style={{
          // Largura EXPLICITA, igual a altura da capsula — e o que faz o
          // circulo ser circulo.
          //
          // Estava `aspect-square`, e nao funciona aqui: num flex com
          // align-items:stretch o navegador resolve a largura do item pelo
          // CONTEUDO antes de esticar a altura, e o aspect-ratio nao tem
          // dimensao definida de onde partir. Resultado: 20px de largura (o
          // icone) por 60 de altura — uma pilula esmagada em pe, nao um
          // botao redondo.
          width: "var(--tf-nav-capsula)",
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "999px",
          boxShadow: "var(--tf-shadow-lg)",
          color: "var(--tf-text-secondary)",
        }}
      >
        <Search size={19} strokeWidth={1.75} />
      </button>
      </div>
    </>
  );
}

/**
 * Spacer para compensar o bottom-nav fixo e evitar que conteúdo fique
 * por baixo dele. Use no final de páginas que exibem o bottom-nav.
 *
 * A altura acompanha a da capsula: 60px + as folgas + o safe-area. Ver o
 * token --tf-altura-nav em globals.css, que e a fonte unica dessa conta.
 */
export function BottomNavSpacer() {
  const isMobile = useIsTabletOrBelow();
  if (!isMobile) return null;
  return <div aria-hidden className="shrink-0" style={{ height: "var(--tf-altura-nav)" }} />;
}
