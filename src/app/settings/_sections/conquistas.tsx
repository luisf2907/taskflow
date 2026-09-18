"use client";

import { useState } from "react";
import useSWR from "swr";
import { Award, ChevronDown } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { definicaoConquista } from "@/lib/conquistas";
import type { Conquista } from "@/types";

/**
 * Insignias da pessoa logada.
 *
 * O modal de comemoracao aparece uma vez e some; sem um lugar permanente a
 * insignia seria so um pop-up. Aqui e o troféu.
 *
 * Cada insignia abre pra mostrar a sugestao que a gerou (feedback bcc3355a).
 * Sem isso, quem tem varias nao sabia qual ideia tinha entrado em qual versao
 * — o modal cita o texto, mas so uma vez.
 *
 * A secao some quando nao ha nenhuma — uma caixa vazia dizendo "voce ainda
 * nao ganhou nada" transforma reconhecimento em cobranca.
 */
export function ConquistasSection({ userId }: { userId?: string }) {
  const [aberta, setAberta] = useState<string | null>(null);

  const { data: conquistas = [] } = useSWR(
    userId ? `conquistas-${userId}` : null,
    async () => {
      const { data } = await supabase
        .from("conquistas")
        .select("id, usuario_id, tipo, feedback_id, versao, vista, criado_em")
        .eq("usuario_id", userId!)
        .order("criado_em", { ascending: false });
      return (data ?? []) as Conquista[];
    },
  );

  const idsFeedback = conquistas
    .map((c) => c.feedback_id)
    .filter((id): id is string => Boolean(id));

  // Uma consulta pra todas as citacoes. A RLS de feedbacks so devolve os da
  // propria pessoa, que e exatamente o que esta tela mostra.
  const { data: mensagens } = useSWR(
    idsFeedback.length > 0 ? `feedbacks-insignias-${idsFeedback.join(",")}` : null,
    async () => {
      const { data } = await supabase
        .from("feedbacks")
        .select("id, mensagem")
        .in("id", idsFeedback);
      return new Map(
        (data ?? []).map((f) => [f.id as string, f.mensagem as string]),
      );
    },
  );

  if (conquistas.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Award size={14} style={{ color: "var(--tf-accent)" }} />
        <h2 className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
          Insígnias
        </h2>
      </div>

      <div
        className="rounded-[var(--tf-radius-md)] p-2 space-y-1"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {conquistas.map((c) => {
          const def = definicaoConquista(c.tipo);
          const mensagem = c.feedback_id ? mensagens?.get(c.feedback_id) : undefined;
          const podeAbrir = Boolean(c.feedback_id);
          const expandida = aberta === c.id;
          const idPainel = `insignia-${c.id}`;

          return (
            <div key={c.id}>
              <button
                type="button"
                disabled={!podeAbrir}
                aria-expanded={podeAbrir ? expandida : undefined}
                aria-controls={podeAbrir ? idPainel : undefined}
                onClick={() => setAberta(expandida ? null : c.id)}
                className="w-full flex items-start gap-3 p-3 text-left transition-colors enabled:hover:bg-[var(--tf-surface-hover)] disabled:cursor-default"
                style={{ borderRadius: "var(--tf-radius-sm)" }}
              >
                <div
                  aria-hidden="true"
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-[1.25rem] leading-none"
                  style={{
                    background: "var(--tf-accent-light)",
                    borderRadius: "var(--tf-radius-sm)",
                  }}
                >
                  {def?.icone ?? "🏅"}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[0.8125rem] font-semibold"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {def?.nome ?? "Contribuição reconhecida"}
                  </p>
                  <p
                    className="text-[0.75rem] mt-0.5 leading-relaxed"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    {def?.descricao ??
                      "Uma contribuição sua ajudou a melhorar o TaskFlow."}
                  </p>
                  <p
                    className="text-[0.6875rem] mt-1"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {c.versao ? `versão ${c.versao} · ` : ""}
                    {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {podeAbrir && (
                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className="shrink-0 mt-1 transition-transform"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      transform: expandida ? "rotate(180deg)" : undefined,
                    }}
                  />
                )}
              </button>

              {expandida && (
                <div id={idPainel} className="px-3 pb-3 pl-[4.25rem]">
                  <blockquote
                    className="text-[0.8125rem] leading-relaxed px-4 py-3 whitespace-pre-line"
                    style={{
                      background: "var(--tf-surface)",
                      borderLeft: "2px solid var(--tf-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                      color: "var(--tf-text-secondary)",
                    }}
                  >
                    <span
                      className="label-mono block mb-1.5"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      Sua sugestão
                    </span>
                    {/* Carregando ou feedback apagado como spam (a FK e
                        ON DELETE SET NULL, mas a citacao pode sumir antes). */}
                    {mensagem ?? (mensagens ? "Esta sugestão não está mais disponível." : "Carregando…")}
                  </blockquote>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
