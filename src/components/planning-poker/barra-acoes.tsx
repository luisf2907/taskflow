"use client";

import { Botao } from "@/components/ui/botao";
import { PokerStatus } from "@/types";
import { Eye, RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";

interface BarraAcoesProps {
  status: PokerStatus;
  podeFacilitar: boolean; // criador ou admin
  totalVotos: number;
  estatisticas: { media: number; moda: number };
  onRevelar: () => void;
  onResetar: () => void;
  onFinalizar: (valor: number) => void;
  onFechar: () => void;
}

const VALORES_RAPIDOS = [0, 1, 2, 3, 5, 8, 13, 21];

export function BarraAcoes({
  status,
  podeFacilitar,
  totalVotos,
  estatisticas,
  onRevelar,
  onResetar,
  onFinalizar,
  onFechar,
}: BarraAcoesProps) {
  const [mostraValores, setMostraValores] = useState(false);
  const [valorCustom, setValorCustom] = useState("");

  const handleFinalizar = (valor: number) => {
    onFinalizar(valor);
    setMostraValores(false);
  };

  return (
    <div className="space-y-3">
      {/* Seletor de valor final */}
      {mostraValores && status === "revelado" && (
        <div
          className="p-3 rounded-[12px] border space-y-2"
          style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--tf-text-secondary)" }}>
            Escolha a estimativa final:
          </p>

          {/* Sugestoes baseadas nos votos */}
          <div className="flex flex-wrap gap-1.5">
            {estatisticas.media > 0 && (
              <button
                onClick={() => handleFinalizar(Math.round(estatisticas.media))}
                className="px-3 py-1.5 rounded-[8px] text-xs font-bold border-2 transition-smooth hover:scale-105"
                style={{
                  borderColor: "var(--tf-accent)",
                  background: "var(--tf-accent)",
                  color: "#fff",
                }}
              >
                Media: {Math.round(estatisticas.media)}
              </button>
            )}
            {estatisticas.moda !== Math.round(estatisticas.media) && (
              <button
                onClick={() => handleFinalizar(estatisticas.moda)}
                className="px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-smooth hover:scale-105"
                style={{
                  borderColor: "var(--tf-accent)",
                  color: "var(--tf-accent)",
                  background: "var(--tf-surface)",
                }}
              >
                Moda: {estatisticas.moda}
              </button>
            )}
          </div>

          {/* Valores fibonacci */}
          <div className="flex flex-wrap gap-1">
            {VALORES_RAPIDOS.map((v) => (
              <button
                key={v}
                onClick={() => handleFinalizar(v)}
                className="w-9 h-9 rounded-[6px] text-xs font-bold border transition-smooth hover:scale-105"
                style={{
                  borderColor: "var(--tf-border)",
                  color: "var(--tf-text)",
                  background: "var(--tf-surface)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Valor custom */}
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={valorCustom}
              onChange={(e) => setValorCustom(e.target.value)}
              placeholder="Outro valor..."
              className="flex-1 px-3 py-1.5 rounded-[8px] border text-xs"
              style={{
                borderColor: "var(--tf-border)",
                background: "var(--tf-surface)",
                color: "var(--tf-text)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valorCustom) {
                  handleFinalizar(Number(valorCustom));
                }
              }}
            />
            {valorCustom && (
              <Botao
                tamanho="sm"
                onClick={() => handleFinalizar(Number(valorCustom))}
              >
                OK
              </Botao>
            )}
          </div>
        </div>
      )}

      {/* Botoes principais */}
      <div className="flex items-center gap-2 flex-wrap">
        {status === "votando" && podeFacilitar && (
          <Botao
            onClick={onRevelar}
            disabled={totalVotos === 0}
            className="flex-1"
          >
            <Eye size={16} />
            Revelar Votos
          </Botao>
        )}

        {status === "revelado" && podeFacilitar && (
          <>
            <Botao
              variante="secundario"
              onClick={onResetar}
              className="flex-1"
            >
              <RotateCcw size={16} />
              Votar Novamente
            </Botao>
            <Botao
              onClick={() => setMostraValores(!mostraValores)}
              className="flex-1"
            >
              <Save size={16} />
              Salvar Estimativa
            </Botao>
          </>
        )}

        {podeFacilitar && (
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={onFechar}
            title="Cancelar sessao"
          >
            <X size={16} />
          </Botao>
        )}
      </div>

      {/* Mensagem para nao-facilitadores */}
      {!podeFacilitar && status === "votando" && (
        <p className="text-xs text-center" style={{ color: "var(--tf-text-tertiary)" }}>
          Aguardando o facilitador revelar os votos...
        </p>
      )}
    </div>
  );
}
