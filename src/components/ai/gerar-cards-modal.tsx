"use client";

import { Modal } from "@/components/ui/modal";
import { Botao } from "@/components/ui/botao";
import { toast } from "@/hooks/use-toast";
import { Etiqueta } from "@/types";
import { getContrastTextColor } from "@/lib/colors";
import { Sparkles, Zap, Trash2, Plus, Loader2, CheckSquare, Tag } from "lucide-react";
import { useState, useCallback } from "react";

interface CardGerado {
  titulo: string;
  descricao: string;
  peso: number;
  checklist: string[];
  etiqueta_ids: string[];
}

interface GerarCardsModalProps {
  aberto: boolean;
  onFechar: () => void;
  workspaceId: string;
  etiquetas?: Etiqueta[];
  onCriarCards: (cards: CardGerado[]) => Promise<void>;
}

export function GerarCardsModal({ aberto, onFechar, workspaceId, etiquetas = [], onCriarCards }: GerarCardsModalProps) {
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [cardsGerados, setCardsGerados] = useState<CardGerado[]>([]);

  const handleGerar = useCallback(async () => {
    if (!texto.trim() || gerando) return;

    setGerando(true);
    setCardsGerados([]);

    try {
      const res = await fetch("/api/ai/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: texto.trim(),
          workspaceId,
          etiquetas: etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao gerar cards");
        return;
      }

      if (!data.cards || data.cards.length === 0) {
        toast.error("Nenhum card foi gerado. Tente descrever melhor.");
        return;
      }

      setCardsGerados(data.cards);
      toast.success(`${data.cards.length} card${data.cards.length > 1 ? "s" : ""} gerado${data.cards.length > 1 ? "s" : ""}!`);
    } catch {
      toast.error("Erro de conexao. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }, [texto, workspaceId, etiquetas, gerando]);

  const handleCriar = useCallback(async () => {
    if (cardsGerados.length === 0 || criando) return;

    setCriando(true);
    try {
      await onCriarCards(cardsGerados);

      toast.success(`${cardsGerados.length} card${cardsGerados.length > 1 ? "s" : ""} criado${cardsGerados.length > 1 ? "s" : ""} no backlog!`);
      setCardsGerados([]);
      setTexto("");
      onFechar();
    } catch {
      toast.error("Erro ao criar cards.");
    } finally {
      setCriando(false);
    }
  }, [cardsGerados, criando, onCriarCards, onFechar]);

  const handleRemoverCard = (idx: number) => {
    setCardsGerados((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditarTitulo = (idx: number, titulo: string) => {
    setCardsGerados((prev) => prev.map((c, i) => (i === idx ? { ...c, titulo } : c)));
  };

  const handleEditarPeso = (idx: number, peso: number) => {
    setCardsGerados((prev) => prev.map((c, i) => (i === idx ? { ...c, peso } : c)));
  };

  const handleToggleEtiqueta = (cardIdx: number, etiquetaId: string) => {
    setCardsGerados((prev) => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      const ids = c.etiqueta_ids.includes(etiquetaId)
        ? c.etiqueta_ids.filter((id) => id !== etiquetaId)
        : [...c.etiqueta_ids, etiquetaId];
      return { ...c, etiqueta_ids: ids };
    }));
  };

  const handleRemoverChecklistItem = (cardIdx: number, itemIdx: number) => {
    setCardsGerados((prev) => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      return { ...c, checklist: c.checklist.filter((_, j) => j !== itemIdx) };
    }));
  };

  const handleVoltar = () => {
    setCardsGerados([]);
  };

  // Map etiqueta ID -> etiqueta para lookup rapido
  const etiquetaMap = new Map(etiquetas.map((e) => [e.id, e]));

  if (!aberto) return null;

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Gerar cards com IA" className="max-w-xl">
      {cardsGerados.length === 0 ? (
        /* FASE 1: Input de texto */
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--tf-text-secondary)" }}>
            Descreva o que precisa ser feito e a IA vai gerar user stories com checklist de criterios e etiquetas automaticas.
          </p>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: Preciso de um sistema de login com Google e email, uma pagina de perfil onde o usuario possa editar seus dados, e um dashboard com graficos de uso..."
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-[var(--tf-radius-sm)] border text-sm resize-none"
            style={{
              borderColor: "var(--tf-border)",
              background: "var(--tf-surface)",
              color: "var(--tf-text)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
            disabled={gerando}
            autoFocus
          />

          {/* Etiquetas disponiveis */}
          {etiquetas.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={12} style={{ color: "var(--tf-text-tertiary)" }} />
              <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                Etiquetas disponiveis:
              </span>
              {etiquetas.map((e) => (
                <span
                  key={e.id}
                  className="px-1.5 py-[1px] rounded text-[9px] font-bold"
                  style={{ backgroundColor: e.cor, color: getContrastTextColor(e.cor) }}
                >
                  {e.nome}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
              {texto.length}/2000
            </span>
            <Botao
              onClick={handleGerar}
              disabled={texto.trim().length < 3 || gerando}
            >
              {gerando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar cards
                </>
              )}
            </Botao>
          </div>
        </div>
      ) : (
        /* FASE 2: Preview dos cards gerados */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: "var(--tf-text-secondary)" }}>
              {cardsGerados.length} card{cardsGerados.length > 1 ? "s" : ""} gerado{cardsGerados.length > 1 ? "s" : ""} — edite antes de criar:
            </p>
            <button
              onClick={handleVoltar}
              className="text-xs px-2 py-1 rounded-[6px] transition-smooth"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              Voltar
            </button>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {cardsGerados.map((card, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[var(--tf-radius-sm)] border space-y-2"
                style={{ borderColor: "var(--tf-border)", background: "var(--tf-surface)" }}
              >
                {/* Header: titulo + peso + remover */}
                <div className="flex items-center gap-2">
                  <input
                    value={card.titulo}
                    onChange={(e) => handleEditarTitulo(idx, e.target.value)}
                    className="flex-1 text-sm font-medium bg-transparent outline-none"
                    style={{ color: "var(--tf-text)" }}
                  />
                  <select
                    value={card.peso}
                    onChange={(e) => handleEditarPeso(idx, Number(e.target.value))}
                    className="text-xs px-2 py-1 rounded-[6px] font-bold"
                    style={{
                      background: "var(--tf-accent)",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    {[1, 2, 3, 5, 8, 13].map((v) => (
                      <option key={v} value={v}>{v} pts</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoverCard(idx)}
                    className="p-1 rounded-[6px] transition-smooth"
                    style={{ color: "var(--tf-text-tertiary)" }}
                    title="Remover card"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Descricao */}
                {card.descricao && (
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
                    {card.descricao}
                  </p>
                )}

                {/* Checklist */}
                {card.checklist.length > 0 && (
                  <div className="space-y-1 pl-1">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckSquare size={11} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
                        Criterios de aceitacao
                      </span>
                    </div>
                    {card.checklist.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-1.5 group/item">
                        <div
                          className="w-3 h-3 rounded-[3px] border shrink-0"
                          style={{ borderColor: "var(--tf-border)" }}
                        />
                        <span className="text-[11px] flex-1" style={{ color: "var(--tf-text-secondary)" }}>
                          {item}
                        </span>
                        <button
                          onClick={() => handleRemoverChecklistItem(idx, itemIdx)}
                          className="p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-smooth"
                          style={{ color: "var(--tf-text-tertiary)" }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Etiquetas */}
                {etiquetas.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {etiquetas.map((e) => {
                      const ativo = card.etiqueta_ids.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => handleToggleEtiqueta(idx, e.id)}
                          className="px-1.5 py-[2px] rounded text-[9px] font-bold transition-smooth"
                          style={{
                            backgroundColor: ativo ? e.cor : "transparent",
                            color: ativo ? "#fff" : e.cor,
                            border: `1px solid ${e.cor}`,
                            opacity: ativo ? 1 : 0.5,
                          }}
                          title={ativo ? `Remover "${e.nome}"` : `Adicionar "${e.nome}"`}
                        >
                          {e.nome}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Soma de pontos */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-[var(--tf-radius-xs)] text-xs"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            <span style={{ color: "var(--tf-text-secondary)" }}>Total estimado:</span>
            <span className="font-bold flex items-center gap-1" style={{ color: "var(--tf-accent)" }}>
              <Zap size={12} />
              {cardsGerados.reduce((s, c) => s + c.peso, 0)} pts
            </span>
          </div>

          <div className="flex gap-2">
            <Botao
              onClick={handleCriar}
              disabled={cardsGerados.length === 0 || criando}
              className="flex-1"
            >
              {criando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Criar {cardsGerados.length} card{cardsGerados.length > 1 ? "s" : ""}
                </>
              )}
            </Botao>
          </div>
        </div>
      )}
    </Modal>
  );
}
