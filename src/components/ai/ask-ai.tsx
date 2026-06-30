"use client";

import { features } from "@/lib/features";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fadeOnly, scaleIn } from "@/lib/motion/presets";
import { Kanban, Send, Sparkles, X } from "lucide-react";

interface CardFonte {
  id: string;
  titulo: string;
  quadro_id: string | null;
  coluna_nome: string | null;
}

interface Mensagem {
  papel: "user" | "model";
  texto: string;
  fontes?: CardFonte[];
  /** quantos chars já revelados (efeito typewriter na resposta) */
  revelado?: number;
}

const SUGESTOES = [
  "O que está atrasado?",
  "Quanto falta pra fechar a sprint ativa?",
  "Quem está com mais cards pendentes?",
  "Tem algo sem responsável?",
];

export function AskAi() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Contexto da rota: em /workspace/[id] o id é o workspace; em /quadro/[id]
  // o id é o quadro/sprint (o backend resolve o workspace a partir dele).
  const contexto = useMemo<{ workspaceId?: string; quadroId?: string } | null>(() => {
    const m = pathname?.match(/\/(workspace|quadro)\/([0-9a-f-]{36})/i);
    if (!m) return null;
    return m[1].toLowerCase() === "workspace"
      ? { workspaceId: m[2] }
      : { quadroId: m[2] };
  }, [pathname]);
  const temContexto = !!contexto;
  // Pra navegação de fallback (quando a fonte não tem quadro_id).
  const workspaceId = contexto?.workspaceId;

  const abrir = useCallback(() => {
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);
  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    function onOpen() {
      abrir();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && aberto) {
        e.stopPropagation();
        fechar();
      }
    }
    window.addEventListener("open-ask-ai", onOpen);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("open-ask-ai", onOpen);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [abrir, fechar, aberto]);

  // Auto-scroll pro fim quando mensagens mudam
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens]);

  // Efeito typewriter: revela a última resposta do model progressivamente.
  useEffect(() => {
    const ultima = mensagens[mensagens.length - 1];
    if (!ultima || ultima.papel !== "model") return;
    if (ultima.revelado === undefined) return;
    if (ultima.revelado >= ultima.texto.length) return;
    const t = setTimeout(() => {
      setMensagens((prev) => {
        const copia = [...prev];
        const u = copia[copia.length - 1];
        if (u && u.papel === "model" && u.revelado !== undefined) {
          copia[copia.length - 1] = {
            ...u,
            revelado: Math.min(u.texto.length, u.revelado + 3),
          };
        }
        return copia;
      });
    }, 12);
    return () => clearTimeout(t);
  }, [mensagens]);

  async function enviar(texto: string) {
    const q = texto.trim();
    if (!q || carregando || !contexto) return;

    const novoHist: Mensagem[] = [...mensagens, { papel: "user", texto: q }];
    setMensagens(novoHist);
    setPergunta("");
    setCarregando(true);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contexto,
          pergunta: q,
          historico: mensagens.slice(-8).map((m) => ({ papel: m.papel, texto: m.texto })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensagens((prev) => [
          ...prev,
          { papel: "model", texto: data.error || "Erro ao consultar a IA.", revelado: 9999 },
        ]);
      } else {
        setMensagens((prev) => [
          ...prev,
          { papel: "model", texto: data.resposta, fontes: data.fontes, revelado: 0 },
        ]);
      }
    } catch {
      setMensagens((prev) => [
        ...prev,
        { papel: "model", texto: "Erro de rede. Tente novamente.", revelado: 9999 },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  function abrirCard(f: CardFonte) {
    fechar();
    if (f.quadro_id) router.push(`/quadro/${f.quadro_id}?card=${f.id}`);
    else if (workspaceId) router.push(`/workspace/${workspaceId}?card=${f.id}`);
  }

  if (!features.ai) return null;

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeOnly}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleIn}
            role="dialog"
            aria-label="Perguntar à IA"
            className="w-full max-w-[560px] flex flex-col overflow-hidden"
            style={{
              height: "min(600px, 85vh)",
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-lg)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 h-12 shrink-0"
              style={{ borderBottom: "1px solid var(--tf-border)" }}
            >
              <Sparkles size={15} strokeWidth={1.75} style={{ color: "var(--tf-accent)" }} />
              <h2
                className="text-[0.875rem] font-semibold flex-1"
                style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
              >
                Perguntar à IA
              </h2>
              <button
                onClick={fechar}
                className="w-7 h-7 flex items-center justify-center transition-colors"
                style={{ color: "var(--tf-text-tertiary)", borderRadius: "var(--tf-radius-xs)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                aria-label="Fechar"
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Conversa */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {mensagens.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
                  <div
                    className="w-11 h-11 flex items-center justify-center"
                    style={{
                      background: "var(--tf-accent-light)",
                      borderRadius: "var(--tf-radius-md)",
                    }}
                  >
                    <Sparkles size={20} strokeWidth={1.5} style={{ color: "var(--tf-accent)" }} />
                  </div>
                  <div>
                    <p className="text-[0.875rem] font-medium" style={{ color: "var(--tf-text)" }}>
                      Pergunte sobre este workspace
                    </p>
                    <p
                      className="text-[0.75rem] mt-1"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      A IA consulta os cards e sprints reais pra responder.
                    </p>
                  </div>
                  {!temContexto && (
                    <p
                      className="text-[0.6875rem]"
                      style={{ color: "var(--tf-warning)", fontFamily: "var(--tf-font-mono)" }}
                    >
                      Abra um workspace ou board primeiro.
                    </p>
                  )}
                  {temContexto && (
                    <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
                      {SUGESTOES.map((s) => (
                        <button
                          key={s}
                          onClick={() => enviar(s)}
                          className="text-[0.75rem] text-left px-3 h-8 transition-colors"
                          style={{
                            background: "var(--tf-surface)",
                            border: "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                            color: "var(--tf-text-secondary)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = "var(--tf-accent)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "var(--tf-border)")
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                mensagens.map((m, i) => <Bolha key={i} m={m} onAbrirCard={abrirCard} />)
              )}

              {carregando && (
                <div className="flex items-center gap-2 px-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--tf-accent)" }}
                  />
                  <span
                    className="text-[0.75rem]"
                    style={{ color: "var(--tf-text-tertiary)", fontFamily: "var(--tf-font-mono)" }}
                  >
                    consultando o workspace…
                  </span>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(pergunta);
              }}
              className="flex items-center gap-2 px-3 h-14 shrink-0"
              style={{ borderTop: "1px solid var(--tf-border)" }}
            >
              <input
                ref={inputRef}
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder={temContexto ? "Pergunte algo…" : "Abra um workspace primeiro"}
                disabled={!temContexto || carregando}
                className="flex-1 h-9 px-3 text-[0.8125rem] outline-none disabled:opacity-50"
                style={{
                  background: "var(--tf-surface)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-sm)",
                  color: "var(--tf-text)",
                }}
              />
              <button
                type="submit"
                disabled={!pergunta.trim() || carregando || !temContexto}
                className="w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-40"
                style={{
                  background: "var(--tf-accent)",
                  color: "#fff",
                  borderRadius: "var(--tf-radius-sm)",
                }}
                aria-label="Enviar"
              >
                <Send size={15} strokeWidth={2} />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================
// Bolha de mensagem
// =============================================
function Bolha({ m, onAbrirCard }: { m: Mensagem; onAbrirCard: (f: CardFonte) => void }) {
  const isUser = m.papel === "user";
  const textoMostrado =
    m.revelado !== undefined && !isUser ? m.texto.slice(0, m.revelado) : m.texto;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] px-3 py-2 text-[0.8125rem]"
          style={{
            background: "var(--tf-accent)",
            color: "#fff",
            borderRadius: "var(--tf-radius-md)",
            borderTopRightRadius: "2px",
            letterSpacing: "-0.005em",
          }}
        >
          {m.texto}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="max-w-[90%] px-3 py-2 text-[0.8125rem] whitespace-pre-wrap"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          color: "var(--tf-text)",
          borderRadius: "var(--tf-radius-md)",
          borderTopLeftRadius: "2px",
          letterSpacing: "-0.005em",
          lineHeight: 1.5,
        }}
      >
        {textoMostrado}
      </div>

      {/* Fontes (cards citados) — só após revelar tudo */}
      {m.fontes && m.fontes.length > 0 && (m.revelado === undefined || m.revelado >= m.texto.length) && (
        <div className="flex flex-wrap gap-1 pl-1">
          {m.fontes.map((f) => (
            <button
              key={f.id}
              onClick={() => onAbrirCard(f)}
              className="flex items-center gap-1 h-6 pl-1.5 pr-2 max-w-[200px] transition-colors"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              title={f.titulo}
            >
              <Kanban size={10} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />
              <span className="text-[0.6875rem] truncate" style={{ color: "var(--tf-text-secondary)" }}>
                {f.titulo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
