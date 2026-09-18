"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowRight, History } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import {
  formatarDuracao,
  nomeColuna,
  permanenciaAtual,
  type Movimentacao,
} from "@/lib/historico-cartao";

/**
 * Por onde o cartao passou, quem moveu e ha quanto tempo esta onde esta.
 * Feedback 1a93358f (Lucas).
 *
 * Os eventos vem da tabela cartao_movimentacoes, gravada por trigger (ver
 * migration 060) — pega todo caminho que move cartao, nao so o arrastar.
 *
 * Se a tabela ainda nao existir (codigo publicado antes da migration), a
 * consulta falha e a secao simplesmente nao aparece. Um erro aqui nao pode
 * derrubar a tela do cartao.
 */

const VISIVEIS_FECHADO = 5;

export function HistoricoCartao({
  cartaoId,
  colunaId,
}: {
  cartaoId: string;
  /** Entra na chave do SWR: mover o cartao pelo painel recarrega o historico. */
  colunaId: string | null;
}) {
  const [expandido, setExpandido] = useState(false);

  const { data: eventos, error } = useSWR(
    `historico-cartao-${cartaoId}-${colunaId ?? "backlog"}`,
    async () => {
      const { data, error } = await supabase
        .from("cartao_movimentacoes")
        .select(
          "id, cartao_id, tipo, coluna_origem_id, coluna_origem_nome, coluna_destino_id, coluna_destino_nome, usuario_id, reconstruido, criado_em, perfis(nome)",
        )
        .eq("cartao_id", cartaoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Movimentacao[];
    },
    { shouldRetryOnError: false },
  );

  if (error || !eventos || eventos.length === 0) return null;

  // eslint-disable-next-line react-hooks/purity -- "ha quanto tempo" precisa do relogio; recalcula a cada render, que e o desejado
  const agora = Date.now();
  const atual = permanenciaAtual(eventos, agora);
  const visiveis = expandido ? eventos : eventos.slice(0, VISIVEIS_FECHADO);
  const escondidos = eventos.length - visiveis.length;

  return (
    <section aria-labelledby={`historico-${cartaoId}`}>
      <div className="flex items-center gap-2 mb-3">
        <History size={13} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
        <h3
          id={`historico-${cartaoId}`}
          className="label-mono"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          Histórico
        </h3>
      </div>

      {atual && (
        <p
          className="text-[0.8125rem] mb-3"
          style={{ color: "var(--tf-text-secondary)", letterSpacing: "-0.005em" }}
        >
          Em{" "}
          <strong style={{ color: "var(--tf-text)", fontWeight: 600 }}>{atual.coluna}</strong>{" "}
          há{" "}
          <strong style={{ color: "var(--tf-text)", fontWeight: 600 }}>
            {formatarDuracao(atual.duracaoMs)}
          </strong>
        </p>
      )}

      <ol className="space-y-2">
        {visiveis.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 text-[0.75rem]">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 mt-[0.4rem] shrink-0 rounded-full"
              style={{
                background: e.tipo === "criado" ? "var(--tf-accent)" : "var(--tf-border-strong)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5" style={{ color: "var(--tf-text)" }}>
                {e.tipo === "criado" ? (
                  <>
                    Criado em{" "}
                    <span className="font-medium">
                      {nomeColuna(e.coluna_destino_id, e.coluna_destino_nome)}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--tf-text-secondary)" }}>
                      {nomeColuna(e.coluna_origem_id, e.coluna_origem_nome)}
                    </span>
                    <ArrowRight
                      size={11}
                      strokeWidth={1.75}
                      aria-label="para"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    />
                    <span className="font-medium">
                      {nomeColuna(e.coluna_destino_id, e.coluna_destino_nome)}
                    </span>
                  </>
                )}
              </p>
              <p
                className="mt-0.5"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  fontSize: "0.6875rem",
                }}
              >
                {autor(e)} · {formatarQuando(e.criado_em)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {escondidos > 0 && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          className="mt-2 text-[0.6875rem] font-medium hover:text-[var(--tf-accent)] transition-colors"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Ver mais {escondidos}
        </button>
      )}
    </section>
  );
}

/**
 * Quem fez. Sem usuario ha dois casos diferentes: a linha reconstruida da
 * criacao (o registro antigo nao guardava o autor) e a movimentacao feita por
 * integracao — API, MCP, automacao, GitHub.
 */
function autor(e: Movimentacao): string {
  if (e.perfis?.nome) return e.perfis.nome;
  if (e.reconstruido) return "autor não registrado";
  return "automático";
}

/** "18/09, 14:32" — ano so quando nao e o atual. */
function formatarQuando(iso: string): string {
  const d = new Date(iso);
  const mesmoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(mesmoAno ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}
