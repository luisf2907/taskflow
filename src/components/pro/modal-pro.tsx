"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { EVENTO_MODAL_PRO } from "@/lib/pro";

/**
 * Aviso de recurso PRO.
 *
 * Montado uma vez em GlobalOverlays e aberto por evento, igual ao Ask AI e ao
 * Help — assim os pontos de entrada (header, card, workspace) nao precisam
 * carregar estado de modal cada um. Quem dispara e `abrirModalPro`, em
 * `@/lib/pro`.
 */

const RECURSOS = [
  "Perguntar à IA sobre o workspace",
  "Gerar cards a partir de uma descrição",
  "Melhorar card com descrição, checklist e triagem",
  "Resumo automático de reuniões",
];

export function ModalPro() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    function abrir() {
      setAberto(true);
    }
    window.addEventListener(EVENTO_MODAL_PRO, abrir);
    return () => window.removeEventListener(EVENTO_MODAL_PRO, abrir);
  }, []);

  return (
    <Modal
      aberto={aberto}
      onFechar={() => setAberto(false)}
      titulo="Recurso PRO"
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          aria-hidden="true"
          className="w-9 h-9 flex items-center justify-center shrink-0"
          style={{
            background: "var(--tf-accent-light)",
            borderRadius: "var(--tf-radius-sm)",
          }}
        >
          <Sparkles size={17} style={{ color: "var(--tf-accent-text)" }} />
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          A IA do TaskFlow faz parte do plano PRO. Estamos liberando acesso aos
          primeiros testadores — fale com a gente se quiser entrar.
        </p>
      </div>

      <ul className="space-y-1.5 mb-5">
        {RECURSOS.map((r) => (
          <li
            key={r}
            className="flex items-center gap-2 text-[13px]"
            style={{ color: "var(--tf-text)" }}
          >
            <Sparkles
              size={12}
              aria-hidden="true"
              style={{ color: "var(--tf-accent-text)" }}
            />
            {r}
          </li>
        ))}
      </ul>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setAberto(false)}
          className="px-4 py-2 text-[13px] font-medium rounded-[var(--tf-radius-xs)]"
          style={{
            color: "var(--tf-text-secondary)",
            background: "var(--tf-bg-secondary)",
          }}
        >
          Agora não
        </button>
        <Link
          href="/pricing"
          onClick={() => setAberto(false)}
          className="px-4 py-2 text-[13px] font-bold text-white rounded-[var(--tf-radius-xs)]"
          style={{ background: "var(--tf-accent)" }}
        >
          Ver planos
        </Link>
      </div>
    </Modal>
  );
}
