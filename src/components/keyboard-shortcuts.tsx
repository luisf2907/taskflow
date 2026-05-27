"use client";

import { useTema } from "@/hooks/use-tema";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut";
import { AnimatePresence, motion } from "motion/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fadeOnly, scaleIn } from "@/lib/motion/presets";

// Pequena Kbd reutilizada (mesmo visual da command-palette).
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[0.6875rem]"
      style={{
        background: "var(--tf-bg-secondary)",
        color: "var(--tf-text-secondary)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </kbd>
  );
}

interface Atalho {
  teclas: string[]; // "C" ou ["G", "D"] (sequência)
  descricao: string;
  contexto?: string;
}

interface Secao {
  titulo: string;
  atalhos: Atalho[];
}

const SECOES: Secao[] = [
  {
    titulo: "Geral",
    atalhos: [
      { teclas: ["Ctrl", "K"], descricao: "Abrir paleta de comandos" },
      { teclas: ["?"], descricao: "Mostrar atalhos de teclado (este painel)" },
      { teclas: ["T"], descricao: "Alternar tema claro/escuro" },
      { teclas: ["/"], descricao: "Focar barra de filtros", contexto: "em um board" },
      { teclas: ["C"], descricao: "Criar novo card", contexto: "em um board" },
      { teclas: ["Esc"], descricao: "Fechar modal/painel ativo" },
    ],
  },
  {
    titulo: "Navegação (sequência)",
    atalhos: [
      { teclas: ["G", "B"], descricao: "Ir para Dashboard (Boards)" },
      { teclas: ["G", "S"], descricao: "Ir para Settings" },
      { teclas: ["G", "W"], descricao: "Ir para Wiki", contexto: "do workspace ativo" },
      { teclas: ["G", "H"], descricao: "Ir para Central de Ajuda" },
    ],
  },
  {
    titulo: "Card aberto",
    atalhos: [
      { teclas: ["E"], descricao: "Editar título do card" },
      { teclas: ["M"], descricao: "Atribuir membro" },
      { teclas: ["L"], descricao: "Adicionar etiqueta" },
      { teclas: ["D"], descricao: "Mudar prazo" },
      { teclas: ["P"], descricao: "Mudar peso (story points)" },
    ],
  },
];

function CheatSheet({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeOnly}
          className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onFechar();
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleIn}
            role="dialog"
            aria-label="Atalhos de teclado"
            className="w-full max-w-[640px] max-h-[80vh] overflow-y-auto"
            style={{
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-lg)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 h-12"
              style={{ borderBottom: "1px solid var(--tf-border)" }}
            >
              <h2
                className="text-[0.9375rem] font-semibold"
                style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
              >
                Atalhos de teclado
              </h2>
              <Kbd>ESC</Kbd>
            </div>

            <div className="px-5 py-4 flex flex-col gap-5">
              {SECOES.map((secao) => (
                <div key={secao.titulo}>
                  <h3
                    className="text-[0.6875rem] font-medium mb-2"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {secao.titulo}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {secao.atalhos.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 py-1.5 px-2"
                        style={{
                          borderRadius: "var(--tf-radius-xs)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[0.8125rem]"
                            style={{
                              color: "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {a.descricao}
                          </p>
                          {a.contexto && (
                            <p
                              className="text-[0.6875rem] mt-0.5"
                              style={{
                                color: "var(--tf-text-tertiary)",
                                fontFamily: "var(--tf-font-mono)",
                              }}
                            >
                              {a.contexto}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {a.teclas.map((t, j) => (
                            <span key={j} className="flex items-center gap-1">
                              {j > 0 && (
                                <span
                                  className="text-[0.625rem]"
                                  style={{ color: "var(--tf-text-tertiary)" }}
                                >
                                  depois
                                </span>
                              )}
                              <Kbd>{t}</Kbd>
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Componente sem UI persistente — registra os shortcuts globais.
 *  Renderiza apenas o CheatSheet (modal de ajuda dos atalhos). */
export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { alternar } = useTema();
  const [cheatSheetAberto, setCheatSheetAberto] = useState(false);

  // Workspace ativo (se houver) para shortcuts contextuais.
  const workspaceAtivo = useMemo(() => {
    const fromParams = (params?.id as string | undefined) || undefined;
    if (fromParams) return fromParams;
    const match = pathname?.match(/^\/(?:workspace|quadro)\/([^/]+)/);
    return match?.[1];
  }, [params, pathname]);

  const navegar = useCallback(
    (path: string) => router.push(path),
    [router]
  );

  // Helper: alguns atalhos (criar card, focar filtro) não devem disparar
  // quando há um modal aberto. Checa por elementos com role="dialog" visíveis.
  const modalAberto = useCallback(() => {
    if (typeof document === "undefined") return false;
    return !!document.querySelector('[role="dialog"]');
  }, []);

  // ESC fecha o cheat sheet (caso usuário aperte ? + ESC).
  useEffect(() => {
    if (!cheatSheetAberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setCheatSheetAberto(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cheatSheetAberto]);

  useKeyboardShortcuts([
    {
      id: "help-shortcuts",
      key: "?",
      handler: () => {
        // Se cheat sheet já está aberto, fecha (toggle).
        // Senão, abre — mas só se NÃO houver outro dialog ativo
        // (ex: HelpModal, detalhe do card, planning poker, etc).
        if (cheatSheetAberto) {
          setCheatSheetAberto(false);
          return;
        }
        if (modalAberto()) return;
        setCheatSheetAberto(true);
      },
    },
    {
      id: "toggle-theme",
      key: "t",
      handler: () => alternar(),
    },
    {
      id: "focus-filter",
      key: "/",
      handler: () => {
        if (modalAberto()) return;
        window.dispatchEvent(new Event("focus-filter"));
      },
    },
    {
      id: "new-card",
      key: "c",
      handler: () => {
        if (modalAberto()) return;
        // KanbanBoard escuta esse evento e abre a entrada na 1ª coluna.
        window.dispatchEvent(new Event("open-novo-card"));
      },
    },
    // Sequências G→X
    {
      id: "goto-board",
      key: "g",
      then: ["b"],
      handler: () => navegar("/dashboard"),
    },
    {
      id: "goto-settings",
      key: "g",
      then: ["s"],
      handler: () => navegar("/settings"),
    },
    {
      id: "goto-wiki",
      key: "g",
      then: ["w"],
      handler: () => {
        if (workspaceAtivo) navegar(`/workspace/${workspaceAtivo}/wiki`);
      },
    },
    {
      id: "goto-help",
      key: "g",
      then: ["h"],
      handler: () => window.dispatchEvent(new Event("open-help-modal")),
    },
  ]);

  return <CheatSheet aberto={cheatSheetAberto} onFechar={() => setCheatSheetAberto(false)} />;
}
