"use client";

import useSWR from "swr";
import { Award } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { definicaoConquista } from "@/lib/conquistas";
import type { Conquista } from "@/types";

/**
 * Insignias da pessoa logada.
 *
 * O modal de comemoracao aparece uma vez e some; sem um lugar permanente a
 * insignia seria so um pop-up. Aqui e o troféu.
 *
 * A secao some quando nao ha nenhuma — uma caixa vazia dizendo "voce ainda
 * nao ganhou nada" transforma reconhecimento em cobranca.
 */
export function ConquistasSection({ userId }: { userId?: string }) {
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
        className="rounded-[var(--tf-radius-md)] p-6 space-y-4"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {conquistas.map((c) => {
          const def = definicaoConquista(c.tipo);
          return (
            <div key={c.id} className="flex items-start gap-3">
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
              <div className="min-w-0">
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
