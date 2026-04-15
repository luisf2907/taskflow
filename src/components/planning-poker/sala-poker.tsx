"use client";

import { Cartao, Membro, PokerSessao, PokerVoto } from "@/types";
import { CartasVotacao } from "./cartas-votacao";
import { PainelParticipantes } from "./painel-participantes";
import { BarraAcoes } from "./barra-acoes";
import { Zap } from "lucide-react";

interface SalaPokerProps {
  sessao: PokerSessao;
  cartao: Cartao | null;
  votos: PokerVoto[];
  membros: Membro[];
  meuVotoValor: string | null;
  podeFacilitar: boolean;
  estatisticas: { media: number; moda: number; consenso: boolean; spread: number };
  onVotar: (valor: string) => void;
  onRevelar: () => void;
  onResetar: () => void;
  onFinalizar: (valor: number) => void;
  onFechar: () => void;
}

export function SalaPoker({
  sessao,
  cartao,
  votos,
  membros,
  meuVotoValor,
  podeFacilitar,
  estatisticas,
  onVotar,
  onRevelar,
  onResetar,
  onFinalizar,
  onFechar,
}: SalaPokerProps) {
  return (
    <div className="space-y-5">
      {/* Cartao em votacao */}
      {cartao && (
        <div
          className="p-4 rounded-[var(--tf-radius-md)] border"
          style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: "var(--tf-text)" }}
              >
                {cartao.titulo}
              </h3>
              {cartao.descricao && (
                <p
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {cartao.descricao}
                </p>
              )}
            </div>
            {cartao.peso !== null && cartao.peso !== undefined && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-xs font-bold shrink-0"
                style={{ background: "var(--tf-accent)", color: "#fff" }}
              >
                <Zap size={12} />
                {cartao.peso} pts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status da sessao */}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: sessao.status === "votando"
              ? "var(--tf-accent)"
              : sessao.status === "revelado"
                ? "var(--tf-success)"
                : "var(--tf-text-tertiary)",
            color: "#fff",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {sessao.status === "votando" ? "Votando..." : "Votos revelados"}
        </div>
        <span
          className="ml-3 text-xs"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {votos.length} voto{votos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cartas de votacao */}
      <CartasVotacao
        valorSelecionado={meuVotoValor}
        onVotar={onVotar}
        desabilitado={sessao.status === "revelado"}
      />

      {/* Painel de participantes */}
      <PainelParticipantes
        membros={membros}
        votos={votos}
        status={sessao.status}
        estatisticas={estatisticas}
      />

      {/* Barra de acoes */}
      <BarraAcoes
        status={sessao.status}
        podeFacilitar={podeFacilitar}
        totalVotos={votos.length}
        estatisticas={estatisticas}
        onRevelar={onRevelar}
        onResetar={onResetar}
        onFinalizar={onFinalizar}
        onFechar={onFechar}
      />
    </div>
  );
}
