"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { Modal } from "@/components/ui/modal";
import { Botao } from "@/components/ui/botao";
import { supabase } from "@/lib/supabase/client";
import { ROTULO_TIPO, type EntradaChangelog, type TipoItemChangelog } from "@/lib/changelog";
import { definicaoConquista } from "@/lib/conquistas";
import type { Aviso } from "@/hooks/use-avisos";
import type { Conquista } from "@/types";

/**
 * Tela de aviso no primeiro login — insignia ganha ou novidades da versao.
 *
 * Diferente dos outros overlays globais, este NAO e aberto por evento: ele
 * aparece sozinho quando a fila do useAvisos tem algo. Quem decide montar e
 * o <AvisosGate> em global-overlays.tsx.
 */

// Cores por tipo de item do changelog. Reaproveitam os tokens semanticos do
// tema em vez de valores fixos, senao o modo escuro fica com etiqueta
// brilhando.
const COR_TIPO: Record<TipoItemChangelog, { fg: string; bg: string }> = {
  // --tf-accent-text, e nao --tf-accent: o laranja puro sobre o fundo claro
  // do accent nao tem contraste suficiente. O par light/text existe no tema
  // justamente pra isso e ja vira nos dois modos.
  novo: { fg: "var(--tf-accent-text)", bg: "var(--tf-accent-light)" },
  melhoria: { fg: "var(--tf-text-secondary)", bg: "var(--tf-bg-secondary)" },
  correcao: { fg: "var(--tf-text-tertiary)", bg: "var(--tf-bg-secondary)" },
};

export function ModalAvisos({
  aviso,
  onDispensar,
}: {
  aviso: Aviso;
  onDispensar: (aviso: Aviso) => void | Promise<void>;
}) {
  // O Modal anima a entrada a partir de `aberto`. Montar ja com true pularia
  // a animacao, entao subimos fechado e abrimos no proximo tick.
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAberto(true);
  }, []);

  // Fecha a animacao ANTES de avisar o hook. Marcar como visto na hora faz a
  // fila recalcular e desmontar o modal no meio da transicao.
  function fechar() {
    setAberto(false);
    window.setTimeout(() => void onDispensar(aviso), 180);
  }

  if (aviso.tipo === "conquista") {
    return (
      <Modal aberto={aberto} onFechar={fechar}>
        <VistaConquista conquista={aviso.conquista} onFechar={fechar} />
      </Modal>
    );
  }

  return (
    <Modal aberto={aberto} onFechar={fechar} titulo="O que há de novo">
      <VistaNovidades entradas={aviso.entradas} onFechar={fechar} />
    </Modal>
  );
}

// ─── Conquista ───

function VistaConquista({
  conquista,
  onFechar,
}: {
  conquista: Conquista;
  onFechar: () => void;
}) {
  const def = definicaoConquista(conquista.tipo);

  // Mostrar o texto original faz a diferenca entre "voce ganhou uma medalha"
  // e "ISTO que voce escreveu virou produto". A RLS de feedbacks so deixa a
  // pessoa ler os proprios, entao nao ha vazamento aqui.
  const { data: mensagemOriginal } = useSWR(
    conquista.feedback_id ? `feedback-conquista-${conquista.feedback_id}` : null,
    async () => {
      const { data } = await supabase
        .from("feedbacks")
        .select("mensagem")
        .eq("id", conquista.feedback_id!)
        .single();
      return (data?.mensagem as string | undefined) ?? null;
    },
  );

  // Tipo que este build nao conhece (CLI de um checkout mais novo). Cai num
  // agradecimento generico em vez de quebrar a tela.
  const icone = def?.icone ?? "🏅";
  const titulo = def?.tituloCelebracao ?? "Obrigado pela contribuição";
  const mensagem =
    def?.mensagemCelebracao ??
    "Uma contribuição sua ajudou a melhorar o TaskFlow.";

  return (
    <div className="text-center pt-2">
      <div
        className="w-20 h-20 mx-auto mb-5 flex items-center justify-center text-[2.5rem] leading-none"
        style={{
          background: "var(--tf-accent-light)",
          borderRadius: "var(--tf-radius-lg)",
        }}
        aria-hidden="true"
      >
        {icone}
      </div>

      <h2
        className="text-[1.125rem] font-bold mb-2"
        style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
      >
        {titulo}
      </h2>

      <p
        className="text-[0.8125rem] leading-relaxed mb-5 mx-auto max-w-[38ch]"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        {mensagem}
      </p>

      {mensagemOriginal && (
        <blockquote
          className="text-left text-[0.8125rem] leading-relaxed px-4 py-3 mb-5"
          style={{
            background: "var(--tf-bg-secondary)",
            borderLeft: "2px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            color: "var(--tf-text-secondary)",
          }}
        >
          <span
            className="label-mono block mb-1.5"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Você escreveu
          </span>
          {mensagemOriginal}
        </blockquote>
      )}

      {def && (
        <p
          className="text-[0.75rem] mb-5"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Insígnia <strong style={{ color: "var(--tf-text-secondary)" }}>{def.nome}</strong>
          {conquista.versao ? ` · versão ${conquista.versao}` : ""} — fica salva
          em Configurações.
        </p>
      )}

      <Botao onClick={onFechar} className="w-full">
        Valeu!
      </Botao>
    </div>
  );
}

// ─── Novidades ───

function VistaNovidades({
  entradas,
  onFechar,
}: {
  entradas: EntradaChangelog[];
  onFechar: () => void;
}) {
  return (
    <div>
      {/* Quem passou varias releases sem entrar recebe todas, da mais nova
          pra mais antiga — por isso a altura e limitada e rola. */}
      <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
        {entradas.map((entrada, i) => (
          <section key={entrada.versao} className={i > 0 ? "mt-6" : ""}>
            <div className="flex items-baseline gap-2 mb-1">
              <h3
                className="text-[0.9375rem] font-bold"
                style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
              >
                {entrada.titulo}
              </h3>
            </div>
            <p
              className="label-mono mb-3"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Versão {entrada.versao} · {formatarData(entrada.data)}
            </p>

            <ul className="space-y-2.5">
              {entrada.itens.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span
                    className="shrink-0 mt-px px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase"
                    style={{
                      color: COR_TIPO[item.tipo].fg,
                      background: COR_TIPO[item.tipo].bg,
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {ROTULO_TIPO[item.tipo]}
                  </span>
                  <span
                    className="text-[0.8125rem] leading-relaxed"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    {item.texto}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-5">
        <Botao onClick={onFechar} className="w-full">
          Entendi
        </Botao>
      </div>
    </div>
  );
}

/** "2026-09-02" -> "2 de set. de 2026". Sem Date() pra nao pegar fuso. */
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  const meses = [
    "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
    "jul.", "ago.", "set.", "out.", "nov.", "dez.",
  ];
  return `${dia} de ${meses[mes - 1]} de ${ano}`;
}
