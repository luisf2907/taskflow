"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Lightbulb, Bug, MessageSquare } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Botao } from "@/components/ui/botao";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/hooks/use-toast";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import {
  EVENTO_MODAL_FEEDBACK,
  MENSAGEM_MAX,
  MENSAGEM_MIN,
  type TipoFeedback,
} from "@/lib/feedback";

/**
 * Formulario de feedback.
 *
 * Montado uma vez em GlobalOverlays e aberto por evento, igual ao Ask AI, ao
 * Help e ao aviso de PRO. Quem dispara e `abrirModalFeedback`, em
 * `@/lib/feedback`.
 */

const TIPOS = [
  { id: "sugestao" as const, label: "Sugestão", icon: Lightbulb },
  { id: "problema" as const, label: "Problema", icon: Bug },
  { id: "outro" as const, label: "Outro", icon: MessageSquare },
];

const PLACEHOLDERS: Record<TipoFeedback, string> = {
  sugestao: "O que faria o TaskFlow funcionar melhor pra você?",
  problema: "O que aconteceu, e o que você esperava que acontecesse?",
  outro: "Manda ver.",
};

/**
 * `abrirAoMontar`: nasce aberto.
 *
 * O GlobalOverlays so monta este componente DEPOIS que alguem pediu o modal,
 * entao "montado" ja significa "pra abrir". Antes a abertura dependia de um
 * <AbrirAoMontar> irmao re-disparar o evento logo apos a montagem — e no
 * PRIMEIRO clique isso nao funcionava: o chunk do dynamic() ainda estava
 * baixando, o listener daqui nao existia e o evento caia no vazio. So o
 * segundo clique abria, com o chunk ja em cache.
 *
 * Era o feedback 6ae2f12b, da Thalita.
 */
export function ModalFeedback({ abrirAoMontar = false }: { abrirAoMontar?: boolean } = {}) {
  const [aberto, setAberto] = useState(abrirAoMontar);
  const [tipo, setTipo] = useState<TipoFeedback>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pathname = usePathname();
  const { activeWorkspaceId } = useActiveWorkspace();

  useEffect(() => {
    function abrir() {
      setAberto(true);
    }
    window.addEventListener(EVENTO_MODAL_FEEDBACK, abrir);
    return () => window.removeEventListener(EVENTO_MODAL_FEEDBACK, abrir);
  }, []);

  function fechar() {
    setAberto(false);
  }

  // O texto so e descartado depois de enviar com sucesso. Fechar sem querer
  // com meia mensagem escrita e o jeito mais rapido de alguem desistir de dar
  // o feedback — reabrir devolve o rascunho.
  async function enviar() {
    const texto = mensagem.trim();
    if (texto.length < MENSAGEM_MIN || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          mensagem: texto,
          pagina: pathname,
          workspace_id: activeWorkspaceId ?? null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.error ?? "Não consegui enviar seu feedback");
        return;
      }

      toast.success("Feedback enviado. Obrigado!");
      setMensagem("");
      setTipo("sugestao");
      setAberto(false);
    } catch {
      toast.error("Sem conexão. Tente de novo em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  const restantes = MENSAGEM_MAX - mensagem.trim().length;
  const podeEnviar = mensagem.trim().length >= MENSAGEM_MIN && restantes >= 0 && !enviando;

  return (
    <Modal aberto={aberto} onFechar={fechar} titulo="Enviar feedback">
      <div className="mb-4">
        <SegmentedControl
          items={TIPOS}
          value={tipo}
          onChange={setTipo}
          fullWidth
          aria-label="Tipo de feedback"
        />
      </div>

      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder={PLACEHOLDERS[tipo]}
        rows={5}
        maxLength={MENSAGEM_MAX}
        // Cmd/Ctrl+Enter envia. Enter sozinho quebra linha, porque relato de
        // problema quase sempre tem mais de uma frase.
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void enviar();
          }
        }}
        className="w-full px-3 py-2 text-[0.8125rem] outline-none transition-smooth resize-y rounded-[var(--tf-radius-sm)] placeholder:text-[var(--tf-text-tertiary)]"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          color: "var(--tf-text)",
          minHeight: "7.5rem",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255, 90, 31, 0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--tf-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      <div className="flex items-center justify-between gap-3 mt-4">
        <p className="text-[0.6875rem]" style={{ color: "var(--tf-text-tertiary)" }}>
          {/* So aparece perto do limite: contador sempre visivel vira pressao
              pra escrever menos, e o que eu quero e o contrario. */}
          {restantes <= 200 ? `${restantes} caracteres restantes` : "Enviado junto com a página atual"}
        </p>

        <div className="flex gap-2 shrink-0">
          <Botao variante="secundario" onClick={fechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao onClick={enviar} disabled={!podeEnviar}>
            {enviando ? "Enviando..." : "Enviar"}
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
