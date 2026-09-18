"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Hourglass, Gauge } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import {
  extremosDeDuracao,
  formatarDuracao,
  tempoPorColuna,
  type CartaoComDuracao,
  type Movimentacao,
} from "@/lib/historico-cartao";

/**
 * Onde o tempo das sprints vai, e quais cartoes puxam a media pra cada lado.
 * Feedback 9847728d (Eduardo).
 *
 * A tela ja mostrava lead time medio, minimo e maximo — so numeros. Faltava:
 *   - o tempo em CADA coluna, que so existe com o historico de movimentacao
 *     (migration 060);
 *   - quais cartoes sao o minimo e o maximo.
 *
 * O painel de colunas some se a tabela de historico ainda nao existir: o
 * de extremos continua, porque vem dos dados que ja estavam na tela.
 */
export function DuracaoCartoes<
  T extends {
    id: string;
    titulo: string;
    criado_em: string | null;
    data_conclusao: string | null;
    concluido: boolean;
  },
>({
  workspaceId,
  sprintIds,
  cartoes,
}: {
  workspaceId: string;
  /** So as sprints que entram nas metricas (concluidas + ativa). */
  sprintIds: string[];
  cartoes: T[];
}) {
  const chave = sprintIds.length > 0 ? `movimentacoes-${workspaceId}-${sprintIds.join(",")}` : null;
  const { data: eventos } = useSWR(
    chave,
    async () => {
      const { data, error } = await supabase
        .from("cartao_movimentacoes")
        .select(
          "id, cartao_id, tipo, coluna_origem_id, coluna_origem_nome, coluna_destino_id, coluna_destino_nome, usuario_id, reconstruido, criado_em",
        )
        .eq("workspace_id", workspaceId)
        .in("quadro_id", sprintIds)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Movimentacao[];
    },
    { shouldRetryOnError: false },
  );

  const porColuna = useMemo(() => (eventos ? tempoPorColuna(eventos) : []), [eventos]);
  const extremos = useMemo(() => extremosDeDuracao(cartoes, 3), [cartoes]);
  const maiorMedia = Math.max(...porColuna.map((c) => c.mediaMs), 1);

  const temColunas = porColuna.length > 0;
  const temExtremos = extremos.rapidos.length > 0;
  if (!temColunas && !temExtremos) return null;

  return (
    <div className={`grid gap-4 ${temColunas && temExtremos ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
      {temColunas && (
        <Painel icone={<Hourglass size={12} strokeWidth={1.75} />} titulo="Tempo médio em cada coluna">
          <p className="text-[0.6875rem] mb-3" style={{ color: "var(--tf-text-tertiary)" }}>
            Só passagens completas — entrou e saiu. A coluna mais demorada é onde os cartões costumam parar.
          </p>
          <ul className="space-y-2.5">
            {porColuna.map((c) => (
              <li key={c.coluna}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className="text-[0.8125rem] font-medium flex-1 min-w-0 truncate"
                    style={{ color: "var(--tf-text)" }}
                    title={c.coluna}
                  >
                    {c.coluna}
                  </span>
                  <span
                    className="text-[0.75rem] font-semibold tabular-nums"
                    style={{ color: "var(--tf-text)", fontFamily: "var(--tf-font-mono)" }}
                  >
                    {formatarDuracao(c.mediaMs)}
                  </span>
                  <span
                    className="text-[0.625rem] tabular-nums w-[5.5rem] text-right shrink-0"
                    style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
                  >
                    {c.passagens} {c.passagens === 1 ? "passagem" : "passagens"}
                  </span>
                </div>
                <div className="h-[5px]" style={{ background: "var(--tf-bg-secondary)", borderRadius: "var(--tf-radius-xs)" }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(c.mediaMs / maiorMedia) * 100}%`,
                      minWidth: 4,
                      background: "var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      {temExtremos && (
        <Painel icone={<Gauge size={12} strokeWidth={1.75} />} titulo="Da criação à conclusão">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ListaExtremos rotulo="Mais rápidos" itens={extremos.rapidos} cor="var(--tf-success)" />
            {extremos.lentos.length > 0 && (
              <ListaExtremos rotulo="Mais lentos" itens={extremos.lentos} cor="var(--tf-danger)" />
            )}
          </div>
        </Painel>
      )}
    </div>
  );
}

function Painel({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-4"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--tf-accent)" }}>
        {icone}
        <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
          {titulo}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ListaExtremos({
  rotulo,
  itens,
  cor,
}: {
  rotulo: string;
  itens: CartaoComDuracao[];
  cor: string;
}) {
  return (
    <div>
      <p className="label-mono mb-2 flex items-center gap-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
        {rotulo}
      </p>
      <ol className="space-y-1.5">
        {itens.map((c) => (
          <li key={c.id} className="flex items-baseline gap-2 text-[0.75rem]">
            <span className="flex-1 min-w-0 truncate" style={{ color: "var(--tf-text)" }} title={c.titulo}>
              {c.titulo}
            </span>
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "var(--tf-text-secondary)", fontFamily: "var(--tf-font-mono)" }}
            >
              {formatarDuracao(c.duracaoMs)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
