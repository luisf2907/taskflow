"use client";

import { useEffect, useRef } from "react";

export interface ShortcutBinding {
  /** Tecla principal. Ex: "k", "?", "Escape". Comparada com KeyboardEvent.key. */
  key: string;
  /** Sequência opcional: se preenchida, a tecla `key` precisa ser pressionada
   *  ANTES das teclas em `then`, na ordem, dentro de SEQUENCE_TIMEOUT_MS.
   *  Ex: { key: "g", then: ["d"] } → aperta G, depois D. */
  then?: string[];
  /** Modificadores. Default: nenhum. */
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Callback ao disparar. Recebe o último KeyboardEvent (após sequência). */
  handler: (e: KeyboardEvent) => void;
  /** Se true, ignora quando o foco está em input/textarea/contenteditable.
   *  Default: true. Use false para shortcuts que devem funcionar em qualquer lugar
   *  (ex: ESC, Cmd+K). */
  ignoreInInputs?: boolean;
  /** Se true, chama preventDefault no evento. Default: true. */
  preventDefault?: boolean;
  /** Identificador opcional para debug. */
  id?: string;
}

const SEQUENCE_TIMEOUT_MS = 1200;

/** Verifica se o foco atual está num campo editável. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  // TipTap usa contenteditable em descendentes — sobe a árvore.
  let el: HTMLElement | null = target;
  while (el) {
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

/** Registra um conjunto de shortcuts globais. Listener único, despacha
 *  internamente para minimizar overhead. Estado da sequência (g→d) mantido
 *  em ref pra sobreviver re-renders. */
export function useKeyboardShortcuts(bindings: ShortcutBinding[]) {
  // Mantém ref atualizada com os bindings sem recriar listener.
  const bindingsRef = useRef(bindings);
  useEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    // Estado da sequência: tecla pressionada e timestamp.
    let pendingPrefix: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      pendingPrefix = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const editable = isEditableTarget(e.target);
      const key = e.key;

      // Primeiro: se há prefixo pendente, tenta casar com a 2ª tecla.
      if (pendingPrefix) {
        const match = bindingsRef.current.find(
          (b) =>
            b.key === pendingPrefix &&
            b.then &&
            b.then.length === 1 &&
            b.then[0].toLowerCase() === key.toLowerCase() &&
            (!b.ignoreInInputs || !editable)
        );
        clearPending();
        if (match) {
          if (match.preventDefault !== false) e.preventDefault();
          match.handler(e);
          return;
        }
        // Sequência inválida, deixa o evento seguir normalmente (não return).
      }

      // Filtra modificadores. Para shortcuts simples, sem modificador.
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      // shift sozinho não conta como modificador (necessário pra "?" = Shift+/)

      // Tenta casar com um binding single-key.
      const single = bindingsRef.current.find((b) => {
        if (b.key.toLowerCase() !== key.toLowerCase()) return false;
        if (b.then) return false; // sequência tratada separadamente abaixo
        if (b.ctrl && !e.ctrlKey) return false;
        if (b.meta && !e.metaKey) return false;
        if (b.alt && !e.altKey) return false;
        if (b.shift !== undefined && b.shift !== e.shiftKey) return false;
        if (!b.ctrl && !b.meta && !b.alt && hasModifier) return false;
        if ((b.ignoreInInputs ?? true) && editable) return false;
        return true;
      });

      if (single) {
        if (single.preventDefault !== false) e.preventDefault();
        single.handler(e);
        return;
      }

      // Não casou single. Verifica se inicia uma sequência (prefix).
      const prefix = bindingsRef.current.find(
        (b) =>
          b.key.toLowerCase() === key.toLowerCase() &&
          b.then &&
          !hasModifier &&
          (!(b.ignoreInInputs ?? true) || !editable)
      );
      if (prefix) {
        pendingPrefix = prefix.key.toLowerCase();
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, []);
}
