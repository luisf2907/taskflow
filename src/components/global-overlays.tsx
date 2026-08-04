"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { features } from "@/lib/features";

// ═══════════════════════════════════════════════════════════════════════
// Overlays globais — montagem sob demanda
// ═══════════════════════════════════════════════════════════════════════
// Command Palette, Ask AI e Help Modal ficavam montados no layout raiz,
// ou seja: entravam no bundle de TODA rota (inclusive a landing) so pra
// renderizar null ate o usuario apertar um atalho. Juntos eram os quatro
// maiores arquivos do grafo do layout (~83KB de source, sendo 33KB so do
// help-content.ts).
//
// Aqui so ficam os listeners (baratos). Na primeira vez que o overlay e
// pedido, o chunk e carregado e o componente montado; um <AbrirAoMontar>
// renderizado DEPOIS dele re-dispara o evento de abertura.
//
// A ordem importa: o React roda os effects na ordem da arvore, entao o
// overlay registra o listener dele antes de o AbrirAoMontar disparar.
// ═══════════════════════════════════════════════════════════════════════

const CommandPalette = dynamic(
  () => import("./command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);
const AskAi = dynamic(() => import("./ai/ask-ai").then((m) => m.AskAi), {
  ssr: false,
});
const HelpModal = dynamic(
  () => import("./help/help-modal").then((m) => m.HelpModal),
  { ssr: false }
);

/** Dispara o evento de abertura uma vez, depois que o overlay irmao montou. */
function AbrirAoMontar({ evento }: { evento: string }) {
  useEffect(() => {
    window.dispatchEvent(new Event(evento));
  }, [evento]);
  return null;
}

export function GlobalOverlays() {
  const [paletteMontada, setPaletteMontada] = useState(false);
  const [askAiMontado, setAskAiMontado] = useState(false);
  const [helpMontado, setHelpMontado] = useState(false);

  // ─── Command Palette: Cmd/Ctrl+K, Cmd/Ctrl+S ou evento ───
  useEffect(() => {
    // Depois de montada, a propria CommandPalette cuida do atalho (inclusive
    // do toggle pra fechar) — aqui so tratamos a primeira abertura.
    if (paletteMontada) return;

    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "s")) {
        e.preventDefault();
        setPaletteMontada(true);
      }
    }
    function onOpen() {
      setPaletteMontada(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [paletteMontada]);

  // ─── Ask AI: so por evento ───
  const montarAskAi = useCallback(() => setAskAiMontado(true), []);
  useEffect(() => {
    if (askAiMontado || !features.ai) return;
    window.addEventListener("open-ask-ai", montarAskAi);
    return () => window.removeEventListener("open-ask-ai", montarAskAi);
  }, [askAiMontado, montarAskAi]);

  // ─── Help Modal: so por evento ───
  const montarHelp = useCallback(() => setHelpMontado(true), []);
  useEffect(() => {
    if (helpMontado) return;
    window.addEventListener("open-help-modal", montarHelp);
    return () => window.removeEventListener("open-help-modal", montarHelp);
  }, [helpMontado, montarHelp]);

  return (
    <>
      {paletteMontada && (
        <>
          <CommandPalette />
          <AbrirAoMontar evento="open-command-palette" />
        </>
      )}
      {askAiMontado && (
        <>
          <AskAi />
          <AbrirAoMontar evento="open-ask-ai" />
        </>
      )}
      {helpMontado && (
        <>
          <HelpModal />
          <AbrirAoMontar evento="open-help-modal" />
        </>
      )}
    </>
  );
}
