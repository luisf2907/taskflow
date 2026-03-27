"use client";

import { useAtividadesWorkspace } from "@/hooks/use-atividades";
import { useColunas } from "@/hooks/use-colunas";
import { useQuadros } from "@/hooks/use-quadros";
import type { AtividadeComAutor } from "@/types";
import {
  Activity,
  ArrowRight,
  Edit3,
  MessageSquare,
  Plus,
  Tag,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AtividadesFeedProps {
  workspaceId: string;
}

// ─── Icon + color mapping ───
const ACAO_CONFIG: Record<string, { icon: typeof Plus; cor: string }> = {
  criar: { icon: Plus, cor: "var(--tf-accent)" },
  mover: { icon: ArrowRight, cor: "#818CF8" },
  atualizar: { icon: Edit3, cor: "#FBBF24" },
  excluir: { icon: Trash2, cor: "var(--tf-danger)" },
  comentar: { icon: MessageSquare, cor: "#60A5FA" },
  atribuir: { icon: Users, cor: "#A78BFA" },
  etiquetar: { icon: Tag, cor: "#F472B6" },
  sprint_status: { icon: Zap, cor: "#FBBF24" },
};

function descreverAtividade(a: AtividadeComAutor): { texto: string; destaque?: string } {
  const { acao, entidade, detalhes } = a;
  const tipo = (detalhes?.tipo as string) ?? "";
  const titulo = (detalhes?.titulo as string) ?? "";

  if (acao === "criar" && entidade === "cartao") return { texto: "criou o cartão", destaque: titulo };
  if (acao === "criar" && entidade === "coluna") return { texto: "criou a coluna", destaque: titulo };
  if (acao === "mover") return { texto: "moveu o cartão", destaque: titulo };
  if (acao === "atualizar" && entidade === "cartao") {
    const campos = (detalhes?.campos as string[]) ?? [];
    if (campos.length === 1) return { texto: `atualizou ${campos[0]} do cartão` };
    return { texto: "atualizou o cartão" };
  }
  if (acao === "atualizar" && entidade === "coluna") return { texto: "renomeou a coluna" };
  if (acao === "excluir" && entidade === "cartao") return { texto: "excluiu o cartão", destaque: titulo };
  if (acao === "excluir" && entidade === "coluna") return { texto: "excluiu a coluna", destaque: titulo };
  if (acao === "excluir" && entidade === "comentario") return { texto: "removeu um comentário" };
  if (acao === "comentar") return { texto: "comentou no cartão" };
  if (acao === "atribuir" && tipo === "adicionar") return { texto: "atribuiu um membro ao cartão" };
  if (acao === "atribuir" && tipo === "remover") return { texto: "removeu um membro do cartão" };
  if (acao === "etiquetar" && tipo === "adicionar") return { texto: "adicionou uma etiqueta" };
  if (acao === "etiquetar" && tipo === "remover") return { texto: "removeu uma etiqueta" };
  if (acao === "sprint_status") {
    const status = (detalhes?.status as string) ?? "";
    const statusMap: Record<string, string> = { ativa: "ativou", concluida: "concluiu", planejada: "planejou" };
    return { texto: `${statusMap[status] || "alterou"} a sprint` };
  }
  return { texto: "realizou uma ação" };
}

function tempoRelativo(data: string): string {
  const diffMs = Date.now() - new Date(data).getTime();
  const min = Math.floor(diffMs / 60000);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);

  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  if (hrs < 24) return `${hrs}h atrás`;

  const d = new Date(data);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  if (d.toDateString() === ontem.toDateString()) return "ontem";
  if (dias < 7) return `${dias} dias atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function agruparPorDia(atividades: AtividadeComAutor[]) {
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  const mapa = new Map<string, AtividadeComAutor[]>();
  for (const a of atividades) {
    const d = new Date(a.criado_em);
    let label: string;
    if (d.toDateString() === hoje.toDateString()) label = "Hoje";
    else if (d.toDateString() === ontem.toDateString()) label = "Ontem";
    else label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    if (!mapa.has(label)) mapa.set(label, []);
    mapa.get(label)!.push(a);
  }
  return Array.from(mapa, ([label, itens]) => ({ label, itens }));
}

function iniciais(nome: string | null): string {
  if (!nome) return "?";
  return nome.split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Avatar com fallback ───
function AvatarAtividade({ nome, avatarUrl }: { nome: string | null; avatarUrl: string | null }) {
  const [imgErro, setImgErro] = useState(false);
  const showImg = avatarUrl && !imgErro;

  return (
    <div
      className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center overflow-hidden shrink-0"
      style={{ background: "var(--tf-accent)" }}
    >
      {showImg ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgErro(true)}
        />
      ) : (
        <span className="text-[10px] font-bold text-white">
          {iniciais(nome)}
        </span>
      )}
    </div>
  );
}

// ─── Component ───
export default function AtividadesFeed({ workspaceId }: AtividadesFeedProps) {
  const { atividades, carregando } = useAtividadesWorkspace(workspaceId);
  const { quadros } = useQuadros();
  const grupos = useMemo(() => agruparPorDia(atividades), [atividades]);

  // Build a map of quadro names for context
  const quadroNomes = useMemo(() => {
    const m: Record<string, string> = {};
    for (const q of quadros) m[q.id] = q.nome;
    return m;
  }, [quadros]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (atividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: "var(--tf-bg-secondary)" }}>
          <Activity size={24} style={{ color: "var(--tf-text-tertiary)" }} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold" style={{ color: "var(--tf-text)" }}>Nenhuma atividade ainda</p>
          <p className="text-[13px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>As ações da equipe aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[650px] overflow-y-auto rounded-[20px] border p-4" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)", scrollbarWidth: "thin" }}>
      {grupos.map((grupo) => (
        <div key={grupo.label}>
          <div className="sticky top-0 z-10 py-2 mb-1 -mx-4 px-4" style={{ background: "var(--tf-surface)", backdropFilter: "blur(8px)" }}>
            <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full" style={{ color: "var(--tf-text-tertiary)", background: "var(--tf-bg-secondary)" }}>
              {grupo.label}
            </span>
          </div>

          {grupo.itens.map((a) => {
            const config = ACAO_CONFIG[a.acao] || ACAO_CONFIG.criar;
            const Icon = config.icon;
            const { texto, destaque } = descreverAtividade(a);
            const sprintNome = a.quadro_id ? quadroNomes[a.quadro_id] : null;

            return (
              <div
                key={a.id}
                className="flex items-start gap-3 py-3 ml-1 border-l-2 pl-4 relative"
                style={{ borderColor: "var(--tf-border-subtle)" }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2"
                  style={{ background: config.cor, borderColor: "var(--tf-surface)" }}
                />

                {/* Icon */}
                <div
                  className="w-8 h-8 min-w-[32px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${config.cor} 15%, transparent)` }}
                >
                  <Icon size={14} style={{ color: config.cor }} strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-relaxed">
                    <span className="font-bold" style={{ color: "var(--tf-text)" }}>
                      {a.perfis?.nome ?? "Usuário"}
                    </span>{" "}
                    <span style={{ color: "var(--tf-text-secondary)" }}>{texto}</span>
                    {destaque && (
                      <span className="font-semibold ml-1" style={{ color: "var(--tf-text)" }}>
                        &quot;{destaque}&quot;
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      {tempoRelativo(a.criado_em)}
                    </span>
                    {sprintNome && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}>
                        {sprintNome}
                      </span>
                    )}
                  </div>
                </div>

                {/* Avatar */}
                <AvatarAtividade nome={a.perfis?.nome ?? null} avatarUrl={a.perfis?.avatar_url ?? null} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
