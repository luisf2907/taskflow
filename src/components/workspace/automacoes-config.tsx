"use client";

import { useAutomacoes } from "@/hooks/use-automacoes";
import { useAutomacaoLogs } from "@/hooks/use-automacao-logs";
import { Coluna, Etiqueta, Membro, TriggerTipo, AcaoTipo } from "@/types";
import { Plus, Trash2, Zap, ZapOff, ArrowRight, X, History, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

interface AutomacoesConfigProps {
  workspaceId: string;
  colunas: Coluna[];
  membros: Membro[];
  etiquetas: Etiqueta[];
}

const TRIGGER_LABELS: Record<TriggerTipo, string> = {
  card_moved_to_column: "Card movido para coluna",
  card_created: "Card criado",
  pr_merged: "PR mergeado",
  pr_opened: "PR aberto",
  pr_closed: "PR fechado (sem merge)",
};

const ACAO_LABELS: Record<AcaoTipo, string> = {
  move_to_column: "Mover para coluna",
  assign_member: "Atribuir membro",
  add_label: "Adicionar etiqueta",
};

export function AutomacoesConfig({ workspaceId, colunas, membros, etiquetas }: AutomacoesConfigProps) {
  const { automacoes, carregando, criar, excluir, toggleAtivo } = useAutomacoes(workspaceId);
  const { logs, carregando: carregandoLogs } = useAutomacaoLogs(workspaceId);
  const [criando, setCriando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"regras" | "historico">("regras");

  // Form state
  const [nome, setNome] = useState("");
  const [triggerTipo, setTriggerTipo] = useState<TriggerTipo>("card_moved_to_column");
  const [triggerColunaId, setTriggerColunaId] = useState("");
  const [acaoTipo, setAcaoTipo] = useState<AcaoTipo>("move_to_column");
  const [acaoColunaId, setAcaoColunaId] = useState("");
  const [acaoMembroId, setAcaoMembroId] = useState("");
  const [acaoEtiquetaId, setAcaoEtiquetaId] = useState("");

  function resetForm() {
    setNome("");
    setTriggerTipo("card_moved_to_column");
    setTriggerColunaId("");
    setAcaoTipo("move_to_column");
    setAcaoColunaId("");
    setAcaoMembroId("");
    setAcaoEtiquetaId("");
    setCriando(false);
  }

  async function handleCriar() {
    if (!nome.trim()) return;

    // Build trigger config
    const triggerConfig: Record<string, string> = {};
    if (triggerTipo === "card_moved_to_column" && triggerColunaId) {
      triggerConfig.coluna_id = triggerColunaId;
    }

    // Build acao config
    const acaoConfig: Record<string, string> = {};
    if (acaoTipo === "move_to_column" && acaoColunaId) {
      acaoConfig.coluna_id = acaoColunaId;
    } else if (acaoTipo === "assign_member" && acaoMembroId) {
      acaoConfig.membro_id = acaoMembroId;
    } else if (acaoTipo === "add_label" && acaoEtiquetaId) {
      acaoConfig.etiqueta_id = acaoEtiquetaId;
    }

    await criar({
      nome: nome.trim(),
      trigger_tipo: triggerTipo,
      trigger_config: triggerConfig,
      acao_tipo: acaoTipo,
      acao_config: acaoConfig,
    });

    resetForm();
  }

  // Helper to get label for a config
  function descricaoTrigger(auto: typeof automacoes[0]): string {
    if (auto.trigger_tipo === "card_moved_to_column") {
      const col = colunas.find((c) => c.id === auto.trigger_config.coluna_id);
      return col ? `→ ${col.nome}` : "";
    }
    return "";
  }

  function descricaoAcao(auto: typeof automacoes[0]): string {
    if (auto.acao_tipo === "move_to_column") {
      const col = colunas.find((c) => c.id === auto.acao_config.coluna_id);
      return col ? `→ ${col.nome}` : "";
    }
    if (auto.acao_tipo === "assign_member") {
      const m = membros.find((m) => m.id === auto.acao_config.membro_id);
      return m ? `→ ${m.nome}` : "";
    }
    if (auto.acao_tipo === "add_label") {
      const e = etiquetas.find((e) => e.id === auto.acao_config.etiqueta_id);
      return e ? `→ ${e.nome}` : "";
    }
    return "";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: "var(--tf-accent)" }} />
          <h3 className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>
            Automações
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
            {automacoes.length}
          </span>
        </div>
        {abaAtiva === "regras" && !criando && (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[8px]"
            style={{ background: "var(--tf-accent)", color: "white", transition: "opacity 0.15s ease" }}
          >
            <Plus size={13} /> Nova Regra
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[10px]" style={{ background: "var(--tf-bg-secondary)" }}>
        <button
          onClick={() => setAbaAtiva("regras")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold rounded-[8px] transition-all"
          style={{
            background: abaAtiva === "regras" ? "var(--tf-surface)" : "transparent",
            color: abaAtiva === "regras" ? "var(--tf-text)" : "var(--tf-text-tertiary)",
            boxShadow: abaAtiva === "regras" ? "var(--tf-shadow-sm)" : "none",
          }}
        >
          <Zap size={13} /> Regras
        </button>
        <button
          onClick={() => setAbaAtiva("historico")}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold rounded-[8px] transition-all"
          style={{
            background: abaAtiva === "historico" ? "var(--tf-surface)" : "transparent",
            color: abaAtiva === "historico" ? "var(--tf-text)" : "var(--tf-text-tertiary)",
            boxShadow: abaAtiva === "historico" ? "var(--tf-shadow-sm)" : "none",
          }}
        >
          <History size={13} /> Histórico {logs.length > 0 && <span className="text-[10px] opacity-60">({logs.length})</span>}
        </button>
      </div>

      {/* ══════ ABA REGRAS ══════ */}
      {abaAtiva === "regras" && <>

      {/* Lista de automações existentes */}
      {automacoes.length > 0 && (
        <div className="space-y-2">
          {automacoes.map((auto) => (
            <div
              key={auto.id}
              className="flex items-center gap-3 p-3.5 rounded-[14px] border group"
              style={{
                borderColor: "var(--tf-border)",
                background: auto.ativo ? "var(--tf-surface)" : "var(--tf-bg-secondary)",
                opacity: auto.ativo ? 1 : 0.6,
                transition: "all 0.15s ease",
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleAtivo(auto.id)}
                className="shrink-0"
                title={auto.ativo ? "Desativar" : "Ativar"}
              >
                {auto.ativo ? (
                  <Zap size={16} style={{ color: "var(--tf-accent)" }} />
                ) : (
                  <ZapOff size={16} style={{ color: "var(--tf-text-tertiary)" }} />
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: "var(--tf-text)" }}>
                  {auto.nome}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
                    {TRIGGER_LABELS[auto.trigger_tipo]} {descricaoTrigger(auto)}
                  </span>
                  <ArrowRight size={10} style={{ color: "var(--tf-text-tertiary)" }} />
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}>
                    {ACAO_LABELS[auto.acao_tipo]} {descricaoAcao(auto)}
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => excluir(auto.id)}
                className="p-1.5 rounded-[8px] opacity-0 group-hover:opacity-100"
                style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease" }}
                title="Excluir regra"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form de criação */}
      {criando && (
        <div
          className="rounded-[14px] p-5 space-y-4 border"
          style={{ borderColor: "var(--tf-accent)", background: "var(--tf-surface)" }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>Nova automação</h4>
            <button onClick={resetForm} className="p-1 rounded-[4px]" style={{ color: "var(--tf-text-tertiary)" }}>
              <X size={14} />
            </button>
          </div>

          {/* Nome */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--tf-text-tertiary)" }}>Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Auto-assign QA"
              className="w-full bg-transparent px-3 py-2.5 text-[13px] rounded-[8px] outline-none"
              style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              autoFocus
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--tf-text-tertiary)" }}>Quando</label>
            <select
              value={triggerTipo}
              onChange={(e) => setTriggerTipo(e.target.value as TriggerTipo)}
              className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none cursor-pointer"
              style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
            >
              {(Object.keys(TRIGGER_LABELS) as TriggerTipo[]).map((t) => (
                <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
              ))}
            </select>

            {triggerTipo === "card_moved_to_column" && (
              <select
                value={triggerColunaId}
                onChange={(e) => setTriggerColunaId(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none mt-2 cursor-pointer"
                style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
              >
                <option value="">Selecionar coluna...</option>
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Ação */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: "var(--tf-text-tertiary)" }}>Então</label>
            <select
              value={acaoTipo}
              onChange={(e) => setAcaoTipo(e.target.value as AcaoTipo)}
              className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none cursor-pointer"
              style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
            >
              {(Object.keys(ACAO_LABELS) as AcaoTipo[]).map((a) => (
                <option key={a} value={a}>{ACAO_LABELS[a]}</option>
              ))}
            </select>

            {acaoTipo === "move_to_column" && (
              <select
                value={acaoColunaId}
                onChange={(e) => setAcaoColunaId(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none mt-2 cursor-pointer"
                style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
              >
                <option value="">Selecionar coluna...</option>
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            )}

            {acaoTipo === "assign_member" && (
              <select
                value={acaoMembroId}
                onChange={(e) => setAcaoMembroId(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none mt-2 cursor-pointer"
                style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
              >
                <option value="">Selecionar membro...</option>
                {membros.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            )}

            {acaoTipo === "add_label" && (
              <select
                value={acaoEtiquetaId}
                onChange={(e) => setAcaoEtiquetaId(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] rounded-[8px] outline-none mt-2 cursor-pointer"
                style={{ border: "2px solid var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-bg-secondary)" }}
              >
                <option value="">Selecionar etiqueta...</option>
                {etiquetas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleCriar}
            disabled={!nome.trim()}
            className="w-full py-2.5 text-[13px] font-semibold text-white rounded-[8px] disabled:opacity-40"
            style={{ background: "var(--tf-accent)", transition: "opacity 0.15s ease" }}
          >
            Criar Automação
          </button>
        </div>
      )}

      {/* Empty state */}
      {automacoes.length === 0 && !criando && (
        <div
          className="rounded-[14px] border-2 border-dashed py-8 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--tf-border)" }}
        >
          <Zap size={24} style={{ color: "var(--tf-border)" }} />
          <p className="text-[13px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>
            Nenhuma automação
          </p>
          <p className="text-[11px] max-w-xs text-center" style={{ color: "var(--tf-text-tertiary)" }}>
            Crie regras para automatizar ações quando cards são movidos, criados ou PRs são mergeados.
          </p>
        </div>
      )}

      </>}

      {/* ══════ ABA HISTÓRICO ══════ */}
      {abaAtiva === "historico" && (
        <div className="space-y-2">
          {carregandoLogs ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
            </div>
          ) : logs.length === 0 ? (
            <div
              className="rounded-[14px] border-2 border-dashed py-8 flex flex-col items-center gap-2"
              style={{ borderColor: "var(--tf-border)" }}
            >
              <History size={24} style={{ color: "var(--tf-border)" }} />
              <p className="text-[13px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>
                Nenhuma execução registrada
              </p>
              <p className="text-[11px] max-w-xs text-center" style={{ color: "var(--tf-text-tertiary)" }}>
                Quando automações forem disparadas, o histórico aparecerá aqui.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const dataStr = new Date(log.criado_em).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              });
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3.5 rounded-[14px] border"
                  style={{
                    borderColor: log.sucesso ? "var(--tf-border)" : "var(--tf-danger)",
                    background: log.sucesso ? "var(--tf-surface)" : "color-mix(in srgb, var(--tf-danger) 5%, var(--tf-surface))",
                  }}
                >
                  {log.sucesso ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: "var(--tf-success)" }} />
                  ) : (
                    <XCircle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--tf-danger)" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--tf-text)" }}>
                      {log.automacao_nome}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
                        {TRIGGER_LABELS[log.trigger_tipo as TriggerTipo] || log.trigger_tipo}
                      </span>
                      <ArrowRight size={10} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}>
                        {ACAO_LABELS[log.acao_tipo as AcaoTipo] || log.acao_tipo}
                      </span>
                    </div>
                    {log.cartao_titulo && (
                      <p className="text-[11px] mt-1 truncate" style={{ color: "var(--tf-text-secondary)" }}>
                        Card: {log.cartao_titulo}
                      </p>
                    )}
                    {log.erro && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--tf-danger)" }}>
                        Erro: {log.erro}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--tf-text-tertiary)" }}>
                    {dataStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
