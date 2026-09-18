"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { Modal } from "@/components/ui/modal";
import { Botao } from "@/components/ui/botao";
import { supabase } from "@/lib/supabase/client";
import type { EntradaChangelog } from "@/lib/changelog";
import { ListaNovidades } from "@/components/avisos/lista-novidades";
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

  if (aviso.tipo === "conquistas") {
    return (
      <Modal aberto={aberto} onFechar={fechar}>
        <VistaConquista conquistas={aviso.conquistas} onFechar={fechar} />
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
  conquistas,
  onFechar,
}: {
  conquistas: Conquista[];
  onFechar: () => void;
}) {
  // Todas do mesmo tipo — o agrupamento e feito por tipo no useAvisos.
  const def = definicaoConquista(conquistas[0].tipo);
  const varias = conquistas.length > 1;

  const idsFeedback = conquistas
    .map((c) => c.feedback_id)
    .filter((id): id is string => Boolean(id));

  // Mostrar o texto original faz a diferenca entre "voce ganhou uma medalha"
  // e "ISTO que voce escreveu virou produto". A RLS de feedbacks so deixa a
  // pessoa ler os proprios, entao nao ha vazamento aqui.
  //
  // Uma consulta para o grupo todo, nao uma por conquista.
  const { data: mensagens = [] } = useSWR(
    idsFeedback.length > 0 ? `feedbacks-conquista-${idsFeedback.join(",")}` : null,
    async () => {
      const { data } = await supabase
        .from("feedbacks")
        .select("id, mensagem")
        .in("id", idsFeedback);
      // Reordena pela ordem das conquistas: o .in() nao garante ordem.
      const porId = new Map(
        (data ?? []).map((f) => [f.id as string, f.mensagem as string]),
      );
      return idsFeedback
        .map((id) => porId.get(id))
        .filter((m): m is string => Boolean(m));
    },
  );

  // Tipo que este build nao conhece (CLI de um checkout mais novo). Cai num
  // agradecimento generico em vez de quebrar a tela.
  const icone = def?.icone ?? "🏅";
  const titulo = varias
    ? (def?.tituloCelebracaoPlural ?? "Obrigado pelas contribuições")
    : (def?.tituloCelebracao ?? "Obrigado pela contribuição");
  const mensagem = varias
    ? (def?.mensagemCelebracaoPlural ??
      "Contribuições suas ajudaram a melhorar o TaskFlow.")
    : (def?.mensagemCelebracao ??
      "Uma contribuição sua ajudou a melhorar o TaskFlow.");

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

      {mensagens.length > 0 && (
        // Rola quando alguem teve muitas sugestoes aceitas de uma vez.
        <div className="max-h-[32vh] overflow-y-auto mb-5 space-y-2">
          {mensagens.map((texto, i) => (
            <blockquote
              key={i}
              className="text-left text-[0.8125rem] leading-relaxed px-4 py-3"
              style={{
                background: "var(--tf-bg-secondary)",
                borderLeft: "2px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
                color: "var(--tf-text-secondary)",
              }}
            >
              {i === 0 && (
                <span
                  className="label-mono block mb-1.5"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Você escreveu
                </span>
              )}
              {texto}
            </blockquote>
          ))}
        </div>
      )}

      {def && (
        <p
          className="text-[0.75rem] mb-5"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {varias ? `${conquistas.length}× a insígnia ` : "Insígnia "}
          <strong style={{ color: "var(--tf-text-secondary)" }}>{def.nome}</strong>
          {conquistas[0].versao ? ` · versão ${conquistas[0].versao}` : ""} — fica
          {varias ? "m" : ""} salva{varias ? "s" : ""} em Configurações.
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
        <ListaNovidades entradas={entradas} />
      </div>

      <div className="mt-5">
        <Botao onClick={onFechar} className="w-full">
          Entendi
        </Botao>
      </div>
    </div>
  );
}
