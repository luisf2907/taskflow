"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { toast } from "@/hooks/use-toast";

/**
 * Copia um texto inteiro pra area de transferencia (feedback 0d143477).
 *
 * Selecionar com o mouse funcionava mal justamente nos textos longos, que sao
 * os que mais valem copiar: a descricao tem rolagem propria e o titulo e um
 * campo editavel, onde arrastar pra selecionar vira edicao.
 *
 * Aparece no hover do grupo pai (`group`) e sempre no toque, via
 * `tf-acao-toque` — no celular nao existe hover.
 */
export function BotaoCopiar({
  texto,
  rotulo,
  tamanho = 13,
  className = "p-1",
}: {
  texto: string;
  /** O que esta sendo copiado, pro leitor de tela: "Copiar título". */
  rotulo: string;
  tamanho?: number;
  /** Inclui o padding (padrao `p-1`): quem passa className define o proprio,
   *  pra nao ficar com duas classes de padding brigando pela ordem do CSS. */
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copiar(e: React.MouseEvent) {
    // O botao mora dentro de areas clicaveis (descricao abre edicao ao
    // clicar). Sem isto, copiar tambem abriria o editor.
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Clipboard API exige contexto seguro e permissao; em HTTP puro ou com
      // a permissao negada ela rejeita.
      toast.error("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  }

  const Icone = copiado ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={copiado ? "Copiado" : rotulo}
      title={copiado ? "Copiado" : rotulo}
      // Visibilidade e UMA classe ou outra: opacity-0 e opacity-100 juntas
      // dependeriam da ordem do CSS gerado. Depois de copiar fica visivel,
      // senao o check de confirmacao sumiria junto com o hover.
      className={`shrink-0 tf-acao-toque transition-opacity hover:bg-[var(--tf-surface-hover)] ${copiado ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"} ${className}`}
      style={{
        color: copiado ? "var(--tf-success)" : "var(--tf-text-tertiary)",
        borderRadius: "var(--tf-radius-xs)",
      }}
    >
      <Icone size={tamanho} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
