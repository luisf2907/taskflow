"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scaleIn } from "@/lib/motion/presets";

const DropdownContext = createContext<(() => void) | undefined>(undefined);

/**
 * Props que o caller controla no <button> do gatilho.
 *
 * `type`, `aria-haspopup`, `aria-expanded` e `onClick` ficam de fora de
 * proposito: sao a semantica do menu, nao aparencia, e o Dropdown os
 * define. `aria-label` sai porque vem do `rotulo`, que e obrigatorio.
 */
type PropsGatilho = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "aria-haspopup" | "aria-expanded" | "onClick" | "aria-label" | "children"
>;

interface DropdownProps {
  /**
   * Conteudo VISUAL do gatilho — icone, avatar, texto. NAO passe um
   * <button>: o Dropdown ja renderiza um em volta disto, e botao dentro de
   * botao e HTML invalido.
   */
  gatilho: React.ReactNode;
  /**
   * Nome acessivel do gatilho. Obrigatorio porque quase todo gatilho daqui
   * e so um icone — sem isto o leitor de tela anuncia "botao" e mais nada.
   * Escreva o que ele ABRE ("Opcoes da coluna Backlog"), nao o desenho.
   */
  rotulo: string;
  /** className, style e handlers de aparencia aplicados ao <button>. */
  propsGatilho?: PropsGatilho;
  children: React.ReactNode;
  className?: string;
  closeOnClick?: boolean;
  /** Renderiza o menu via React portal em document.body. Evita ser cortado
   *  por containers com overflow:hidden / clip-path. Default false. */
  portal?: boolean;
}

/**
 * `.tf-botao-nu` vive em globals.css, dentro de @layer base — ver o
 * comentario la. Em resumo: <button> nao herda fonte do pai, e tres dos
 * gatilhos daqui eram <div>, entao sem o reset eles passariam a renderizar
 * na fonte padrao do navegador. A classe fica numa layer anterior a das
 * utilities para que qualquer classe do caller a sobreponha.
 */
const RESET_GATILHO = "tf-botao-nu";

export function Dropdown({
  gatilho,
  rotulo,
  propsGatilho,
  children,
  className,
  closeOnClick = true,
  portal = false,
}: DropdownProps) {
  const [aberto, setAberto] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  const focarPrimeiroItem = useCallback(() => {
    setTimeout(() => {
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      items?.[0]?.focus();
    }, 0);
  }, []);

  // Posiciona o menu portal alinhado ao gatilho.
  // set-state-in-effect intencional: precisamos do bounding rect do DOM,
  // só conhecido após o gatilho renderizar.
  useLayoutEffect(() => {
    if (!portal || !aberto) return;
    const rect = botaoRef.current?.getBoundingClientRect();
    if (!rect) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [portal, aberto]);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      const target = e.target as Node;
      // Quando o menu é renderizado via portal, ref.current não contém o menu.
      // Por isso checamos tanto o gatilho (ref) quanto o menu (menuRef).
      const dentroTrigger = ref.current?.contains(target);
      const dentroMenu = menuRef.current?.contains(target);
      if (!dentroTrigger && !dentroMenu) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Fechado, so a seta pra baixo interessa: Enter e Espaco ja viram
      // clique sozinhos, porque agora o gatilho e um <button> de verdade.
      if (!aberto) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setAberto(true);
          focarPrimeiroItem();
        }
        return;
      }

      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      if (!items?.length) return;

      const current = document.activeElement as HTMLElement;
      const idx = Array.from(items).indexOf(current as HTMLButtonElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          setAberto(false);
          botaoRef.current?.focus();
          break;
        case "Home":
          e.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    },
    [aberto, focarPrimeiroItem]
  );

  const menu = (
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label={rotulo}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      className={cn(
        portal ? "fixed min-w-[200px] py-1 z-[100] border" : "absolute right-0 mt-1 min-w-[200px] py-1 z-50 border",
        "rounded-[var(--tf-radius-md)]",
        className
      )}
      style={{
        ...(portal ? { top: coords?.top ?? -9999, right: coords?.right ?? -9999 } : {}),
        background: "var(--tf-surface-raised)",
        borderColor: "var(--tf-border)",
        boxShadow: "var(--tf-shadow-md)",
        transformOrigin: "top right",
      }}
    >
      <DropdownContext.Provider value={closeOnClick ? () => setAberto(false) : undefined}>
        {children}
      </DropdownContext.Provider>
    </motion.div>
  );

  return (
    // O onKeyDown aqui e DELEGACAO: captura setas, Escape, Home e End vindas
    // tanto do gatilho quanto dos itens do menu. Precisa ficar no wrapper
    // porque o foco pode estar nos dois lugares — abrir com o mouse deixa o
    // foco no botao, abrir com teclado joga pro primeiro item. Funciona
    // mesmo com `portal`: o React propaga eventos pela arvore de
    // componentes, nao pela do DOM.
    //
    // O <div> em si nao e um controle, entao nao leva role nem tabIndex —
    // isso criaria uma parada fantasma no Tab. A regra nao distingue
    // delegacao de interacao propria.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        {...propsGatilho}
        ref={botaoRef}
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={cn(RESET_GATILHO, propsGatilho?.className)}
        onClick={(e) => {
          // detail === 0 significa clique sintetizado pelo teclado (Enter ou
          // Espaco num <button>). So nesse caso o foco desce pro primeiro
          // item; com mouse ele fica no botao, como se espera.
          const porTeclado = e.detail === 0;
          setAberto((v) => !v);
          if (!aberto && porTeclado) focarPrimeiroItem();
        }}
      >
        {gatilho}
      </button>
      <AnimatePresence>
        {aberto && (portal && typeof document !== "undefined" ? createPortal(menu, document.body) : menu)}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  perigo?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, perigo, className }: DropdownItemProps) {
  const closeDropdown = useContext(DropdownContext);
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        onClick?.();
        closeDropdown?.();
      }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[0.8125rem] transition-smooth outline-none",
        "rounded-[var(--tf-radius-xs)] mx-1",
        className
      )}
      style={{
        color: perigo ? "var(--tf-danger)" : "var(--tf-text)",
        width: "calc(100% - 8px)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onFocus={(e) =>
        (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")
      }
      onBlur={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
