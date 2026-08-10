"use client";

import { Modal } from "@/components/ui/modal";
import { Botao } from "@/components/ui/botao";
import { toast } from "@/hooks/use-toast";
import { Etiqueta } from "@/types";
import { getContrastTextColor } from "@/lib/colors";
import { abrirModalPro, ehErroDePlano } from "@/lib/pro";
import { Sparkles, Zap, Trash2, Plus, Loader2, CheckSquare, Tag, ListChecks, FileText } from "lucide-react";
import { lerNdjson } from "@/lib/ai/ndjson";
import { LIMITES, type ModoGeracao, type ModoPedido } from "@/lib/ai/backlog-input";
import type { EtiquetaNova } from "@/lib/ai/etiquetas-sugeridas";
import { useState, useCallback, useEffect } from "react";

/**
 * Loading "terminal-like" pra fase de geracao — feedback vivo em vez
 * de spinner estatico. Cicla mensagens sugerindo o que a IA esta
 * fazendo, com cursor piscante.
 */
function TerminalGerando() {
  const etapas = [
    "Analisando contexto",
    "Identificando tarefas",
    "Gerando criterios de aceitacao",
    "Sugerindo etiquetas",
    "Estimando pontos",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % etapas.length);
    }, 1400);
    return () => clearInterval(t);
  }, [etapas.length]);

  return (
    <div
      className="rounded-[var(--tf-radius-sm)] p-4 space-y-1.5"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
        fontFamily: "var(--tf-font-mono)",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[0.6875rem]"
        style={{ color: "var(--tf-text-tertiary)", letterSpacing: "0.02em" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--tf-accent)" }}
        />
        <span>taskflow:ai ~ gerando</span>
      </div>
      <div className="space-y-0.5 text-[0.75rem]">
        {etapas.map((etapa, i) => {
          const concluida = i < idx;
          const atual = i === idx;
          const pendente = i > idx;
          return (
            <div
              key={etapa}
              className="flex items-start gap-2"
              style={{
                color: concluida
                  ? "var(--tf-text-secondary)"
                  : atual
                    ? "var(--tf-accent)"
                    : "var(--tf-text-tertiary)",
                opacity: pendente ? 0.5 : 1,
                transition: "opacity 0.3s, color 0.3s",
              }}
            >
              <span style={{ color: "var(--tf-accent)", width: 14, flexShrink: 0 }}>
                {concluida ? "✓" : atual ? ">" : " "}
              </span>
              <span className="flex-1 inline-flex items-center">
                <span>{etapa}</span>
                {atual && (
                  <>
                    <span
                      aria-hidden
                      className="inline-flex ml-0.5"
                      style={{ letterSpacing: 0 }}
                    >
                      <span style={{ animation: "tf-terminal-dot 1.2s infinite 0s" }}>.</span>
                      <span style={{ animation: "tf-terminal-dot 1.2s infinite 0.2s" }}>.</span>
                      <span style={{ animation: "tf-terminal-dot 1.2s infinite 0.4s" }}>.</span>
                    </span>
                    <span
                      aria-hidden
                      className="inline-block w-[6px] h-[10px] ml-1"
                      style={{
                        background: "var(--tf-accent)",
                        animation: "tf-terminal-blink 1s steps(2, end) infinite",
                        verticalAlign: "baseline",
                      }}
                    />
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes tf-terminal-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes tf-terminal-dot {
          0%, 60%, 100% { opacity: 0.2; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface CardGerado {
  titulo: string;
  descricao: string;
  peso: number;
  checklist: string[];
  /** id de etiqueta existente, ou `novo:<i>` apontando pra `etiquetasNovas`. */
  etiqueta_ids: string[];
}

/** Como a geracao correu — montado a partir dos eventos da rota. */
interface InfoGeracao {
  modo: ModoGeracao;
  itens: number;
  ignorados: number;
  crus: number;
  recusadas: string[];
}

/** Etiqueta oferecida no preview: existente ou proposta pela IA. */
interface EtiquetaOpcao {
  id: string;
  nome: string;
  cor: string;
  nova?: boolean;
}

interface GerarCardsModalProps {
  aberto: boolean;
  onFechar: () => void;
  workspaceId: string;
  etiquetas?: Etiqueta[];
  onCriarCards: (cards: CardGerado[], etiquetasNovas: EtiquetaNova[]) => Promise<void>;
}

export function GerarCardsModal({ aberto, onFechar, workspaceId, etiquetas = [], onCriarCards }: GerarCardsModalProps) {
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [cardsGerados, setCardsGerados] = useState<CardGerado[]>([]);
  const [etiquetasNovas, setEtiquetasNovas] = useState<EtiquetaNova[]>([]);
  const [modoPedido, setModoPedido] = useState<ModoPedido>("auto");
  const [info, setInfo] = useState<InfoGeracao | null>(null);
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);

  const handleGerar = useCallback(
    async (modo: ModoPedido) => {
      if (!texto.trim() || gerando) return;

      setGerando(true);
      setCardsGerados([]);
      setEtiquetasNovas([]);
      setInfo(null);
      setProgresso(null);

      try {
        const res = await fetch("/api/ai/generate-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texto: texto.trim(),
            workspaceId,
            modo,
            etiquetas: etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })),
          }),
        });

        // Falhas anteriores ao stream (auth, plano, validacao, rate limit)
        // continuam vindo como JSON com status.
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          if (ehErroDePlano(data)) {
            abrirModalPro();
            return;
          }
          toast.error(data.error || "Erro ao gerar cards");
          return;
        }

        let modoUsado: ModoGeracao = "requisito";
        let itens = 0;
        let ignorados = 0;
        let crus = 0;
        let recusadas: string[] = [];
        let recebidos: CardGerado[] = [];
        let novas: EtiquetaNova[] = [];
        let erro = "";

        await lerNdjson(res.body, (ev) => {
          if (ev.tipo === "inicio") {
            modoUsado = ev.modo as ModoGeracao;
            itens = Number(ev.itens ?? 0);
            ignorados = Number(ev.ignorados ?? 0);
            setProgresso({ feito: 0, total: Number(ev.lotes ?? 1) });
          } else if (ev.tipo === "lote") {
            setProgresso({ feito: Number(ev.feito ?? 0), total: Number(ev.total ?? 1) });
          } else if (ev.tipo === "fim") {
            recebidos = (ev.cards as CardGerado[]) ?? [];
            novas = (ev.etiquetas_novas as EtiquetaNova[]) ?? [];
            crus = Number(ev.crus ?? 0);
            recusadas = (ev.recusadas as string[]) ?? [];
          } else if (ev.tipo === "erro") {
            erro = String(ev.error ?? "Erro ao gerar cards");
          }
        });

        if (erro) {
          toast.error(erro);
          return;
        }
        if (recebidos.length === 0) {
          toast.error("Nenhum card foi gerado. Tente descrever melhor.");
          return;
        }

        setCardsGerados(recebidos);
        setEtiquetasNovas(novas);
        setInfo({ modo: modoUsado, itens, ignorados, crus, recusadas });
        toast.success(
          `${recebidos.length} card${recebidos.length > 1 ? "s" : ""} gerado${recebidos.length > 1 ? "s" : ""}!`
        );
      } catch {
        toast.error("Erro de conexao. Tente novamente.");
      } finally {
        setGerando(false);
        setProgresso(null);
      }
    },
    [texto, workspaceId, etiquetas, gerando]
  );

  const handleCriar = useCallback(async () => {
    if (cardsGerados.length === 0 || criando) return;

    setCriando(true);
    try {
      // Manda a lista completa: quem cria decide quais etiquetas novas
      // ainda estao em uso. Filtrar aqui embaralharia os indices de `novo:<i>`.
      await onCriarCards(cardsGerados, etiquetasNovas);

      toast.success(`${cardsGerados.length} card${cardsGerados.length > 1 ? "s" : ""} criado${cardsGerados.length > 1 ? "s" : ""} no backlog!`);
      setCardsGerados([]);
      setEtiquetasNovas([]);
      setInfo(null);
      setTexto("");
      onFechar();
    } catch {
      toast.error("Erro ao criar cards.");
    } finally {
      setCriando(false);
    }
  }, [cardsGerados, etiquetasNovas, criando, onCriarCards, onFechar]);

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
    setEtiquetasNovas([]);
    setInfo(null);
    // Volta pro automatico: um "tratar como lista" de antes nao deve reger
    // a proxima geracao, que pode ser de um texto completamente diferente.
    setModoPedido("auto");
  };

  // Etiquetas oferecidas no preview: as do workspace + as propostas pela IA.
  const opcoesEtiqueta: EtiquetaOpcao[] = [
    ...etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })),
    ...etiquetasNovas.map((e, i) => ({ id: `novo:${i}`, nome: e.nome, cor: e.cor, nova: true })),
  ];

  // Acima disso a lista vira um paredao; o checklist passa a ser sob demanda.
  const compacto = cardsGerados.length > 8;

  if (!aberto) return null;

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Gerar cards com IA" className="max-w-xl">
      {cardsGerados.length === 0 ? (
        /* FASE 1: Input de texto */
        <div className="space-y-4">
          <div
            className="flex items-center gap-1.5 text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--tf-accent)" }}>$</span>
            <span>prompt</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>descreva o requisito ou cole sua lista de tarefas</span>
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: Preciso de um sistema de login com Google e email, uma pagina de perfil onde o usuario possa editar seus dados, e um dashboard com graficos de uso..."
            rows={8}
            maxLength={LIMITES.TEXTO_MAX}
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

          {gerando && (
            <>
              <TerminalGerando />
              {progresso && progresso.total > 1 && (
                <div className="space-y-1">
                  <div
                    className="flex items-center justify-between text-[11px]"
                    style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
                  >
                    <span>lote {progresso.feito} de {progresso.total}</span>
                    <span>{Math.round((progresso.feito / progresso.total) * 100)}%</span>
                  </div>
                  <div
                    className="w-full h-[3px] overflow-hidden"
                    style={{ background: "var(--tf-border)", borderRadius: "1px" }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(progresso.feito / progresso.total) * 100}%`,
                        background: "var(--tf-accent)",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

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
              {texto.length}/{LIMITES.TEXTO_MAX}
            </span>
            <Botao
              onClick={() => handleGerar(modoPedido)}
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

          {/* O que a IA entendeu da entrada. Detectar o modo sem mostrar
              faria a escolha errada passar por "a IA e ruim". */}
          {info && (
            <div
              className="px-3 py-2 rounded-[var(--tf-radius-xs)] space-y-1"
              style={{ background: "var(--tf-bg-secondary)" }}
            >
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {info.modo === "lista" ? (
                  <ListChecks size={12} style={{ color: "var(--tf-accent)" }} />
                ) : (
                  <FileText size={12} style={{ color: "var(--tf-accent)" }} />
                )}
                <span style={{ color: "var(--tf-text-secondary)" }}>
                  {info.modo === "lista"
                    ? `Li como lista de tarefas — ${info.itens} ${info.itens === 1 ? "item" : "itens"}, um card por item.`
                    : "Li como requisito e quebrei em cards."}
                </span>
                <button
                  onClick={() => {
                    const outro = info.modo === "lista" ? "requisito" : "lista";
                    setModoPedido(outro);
                    handleGerar(outro);
                  }}
                  disabled={gerando}
                  className="underline disabled:opacity-40"
                  style={{ color: "var(--tf-accent-text)" }}
                >
                  {info.modo === "lista" ? "Tratar como requisito" : "Tratar como lista"}
                </button>
              </div>

              {info.ignorados > 0 && (
                <p className="text-[11px]" style={{ color: "var(--tf-warning)" }}>
                  {info.ignorados} {info.ignorados === 1 ? "item ficou" : "itens ficaram"} de fora: o limite e {LIMITES.CARDS_LISTA} por geracao. Cole o resto depois.
                </p>
              )}
              {info.crus > 0 && (
                <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  {info.crus} {info.crus === 1 ? "item veio" : "itens vieram"} sem peso e sem checklist — a IA nao deu conta deles.
                </p>
              )}
              {info.recusadas.length > 0 && (
                <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  Etiquetas sugeridas alem do limite e descartadas: {info.recusadas.join(", ")}.
                </p>
              )}
            </div>
          )}

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

                {/* Com muitos cards o checklist some pra lista caber na tela,
                    mas a contagem fica — senao parece que a IA nao gerou nada. */}
                {card.checklist.length > 0 && compacto && (
                  <div className="flex items-center gap-1">
                    <CheckSquare size={11} style={{ color: "var(--tf-text-tertiary)" }} />
                    <span className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      {card.checklist.length} criterio{card.checklist.length > 1 ? "s" : ""} de aceitacao
                    </span>
                  </div>
                )}

                {/* Checklist */}
                {card.checklist.length > 0 && !compacto && (
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
                          className="p-0.5 rounded tf-acao-toque opacity-0 group-hover/item:opacity-100 transition-smooth"
                          style={{ color: "var(--tf-text-tertiary)" }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Etiquetas — as marcadas "nova" so viram registro no criar,
                    e apenas se sobrarem em algum card. */}
                {opcoesEtiqueta.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {opcoesEtiqueta.map((e) => {
                      const ativo = card.etiqueta_ids.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() => handleToggleEtiqueta(idx, e.id)}
                          className="px-1.5 py-[2px] rounded text-[9px] font-bold transition-smooth"
                          style={{
                            backgroundColor: ativo ? e.cor : "transparent",
                            color: ativo ? getContrastTextColor(e.cor) : e.cor,
                            border: e.nova ? `1px dashed ${e.cor}` : `1px solid ${e.cor}`,
                            opacity: ativo ? 1 : 0.5,
                          }}
                          title={
                            e.nova
                              ? `Etiqueta nova "${e.nome}" — sera criada no workspace`
                              : ativo
                                ? `Remover "${e.nome}"`
                                : `Adicionar "${e.nome}"`
                          }
                        >
                          {e.nome}
                          {e.nova && " +"}
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
