"use client";

import { supabase } from "@/lib/supabase/client";
import { Coluna } from "@/types";
import {
  Check,
  Copy,
  Globe,
  Key,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface RepoWebhookConfigProps {
  repoId: string;
  workspaceId: string;
  colunas: Coluna[];
  webhookSecret: string | null;
  colunaReviewId: string | null;
  colunaDoneId: string | null;
  colunaDoingId: string | null;
  onSalvar: () => void;
}

export function RepoWebhookConfig({
  repoId,
  workspaceId,
  colunas,
  webhookSecret: secretInicial,
  colunaReviewId: reviewInicial,
  colunaDoneId: doneInicial,
  colunaDoingId: doingInicial,
  onSalvar,
}: RepoWebhookConfigProps) {
  const [secret, setSecret] = useState(secretInicial || "");
  const [reviewId, setReviewId] = useState(reviewInicial || "");
  const [doneId, setDoneId] = useState(doneInicial || "");
  const [doingId, setDoingId] = useState(doingInicial || "");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Sincronizar form com props vindos do banco. set-state-in-effect intencional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSecret(secretInicial || "");
    setReviewId(reviewInicial || "");
    setDoneId(doneInicial || "");
    setDoingId(doingInicial || "");
  }, [secretInicial, reviewInicial, doneInicial, doingInicial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function gerarSecret() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setSecret(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  async function copiar(texto: string, label: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(label);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function salvar() {
    setSalvando(true);
    await supabase.from("repositorios").update({
      webhook_secret: secret || null,
      coluna_review_id: reviewId || null,
      coluna_done_id: doneId || null,
      coluna_doing_id: doingId || null,
    }).eq("id", repoId);

    // Create default automations for any mapped columns that don't have automations yet
    if (workspaceId && (doneId || reviewId || doingId)) {
      const { data: existentes } = await supabase
        .from("automacoes")
        .select("trigger_tipo")
        .eq("workspace_id", workspaceId)
        .in("trigger_tipo", ["pr_merged", "pr_opened", "pr_closed"]);

      const existingTriggers = new Set((existentes || []).map((e) => e.trigger_tipo));
      const defaults = [];

      // PR merged → move to Done column
      if (doneId && !existingTriggers.has("pr_merged")) {
        defaults.push({
          workspace_id: workspaceId,
          nome: "PR merged → Concluído",
          trigger_tipo: "pr_merged",
          trigger_config: {},
          acao_tipo: "move_to_column",
          acao_config: { coluna_id: doneId },
          ativo: true,
        });
      }

      // PR opened → move to Review column
      if (reviewId && !existingTriggers.has("pr_opened")) {
        defaults.push({
          workspace_id: workspaceId,
          nome: "PR aberto → Review",
          trigger_tipo: "pr_opened",
          trigger_config: {},
          acao_tipo: "move_to_column",
          acao_config: { coluna_id: reviewId },
          ativo: true,
        });
      }

      // PR closed (without merge) → move to Doing/A Fazer column
      if (doingId && !existingTriggers.has("pr_closed")) {
        defaults.push({
          workspace_id: workspaceId,
          nome: "PR fechado → Em Andamento",
          trigger_tipo: "pr_closed",
          trigger_config: {},
          acao_tipo: "move_to_column",
          acao_config: { coluna_id: doingId },
          ativo: true,
        });
      }

      if (defaults.length > 0) {
        await supabase.from("automacoes").insert(defaults);
      }
    }

    setSalvando(false);
    onSalvar();
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/github`
    : "/api/webhooks/github";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 size={15} style={{ color: "var(--tf-accent)" }} />
        <h4
          className="text-sm font-semibold"
          style={{ color: "var(--tf-text)" }}
        >
          Configuração do Webhook
        </h4>
      </div>

      {/* Webhook URL */}
      <div>
        <label
          className="text-[11px] font-medium mb-1 flex items-center gap-1.5"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          <Globe size={11} />
          Payload URL (cole no GitHub)
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="flex-1 px-3 py-2 rounded-[var(--tf-radius-xs)] text-xs font-mono"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          />
          <button
            onClick={() => copiar(webhookUrl, "url")}
            className="px-2.5 py-2 rounded-[var(--tf-radius-xs)] transition-smooth"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: copiado === "url" ? "var(--tf-success)" : "var(--tf-text-tertiary)",
            }}
          >
            {copiado === "url" ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Secret */}
      <div>
        <label
          className="text-[11px] font-medium mb-1 flex items-center gap-1.5"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          <Key size={11} />
          Secret
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Gere ou cole um secret"
            className="flex-1 px-3 py-2 rounded-[var(--tf-radius-xs)] text-xs font-mono"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          />
          <button
            onClick={gerarSecret}
            className="px-2.5 py-2 rounded-[var(--tf-radius-xs)] transition-smooth"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text-tertiary)",
            }}
            title="Gerar secret"
          >
            <RefreshCw size={13} />
          </button>
          {secret && (
            <button
              onClick={() => copiar(secret, "secret")}
              className="px-2.5 py-2 rounded-[var(--tf-radius-xs)] transition-smooth"
              style={{
                background: "var(--tf-bg)",
                border: "1px solid var(--tf-border)",
                color: copiado === "secret" ? "var(--tf-success)" : "var(--tf-text-tertiary)",
              }}
            >
              {copiado === "secret" ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Column mapping */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>
            Coluna Review
          </label>
          <select
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-[var(--tf-radius-xs)] text-xs"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          >
            <option value="">Selecione...</option>
            {colunas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>
            Coluna Done
          </label>
          <select
            value={doneId}
            onChange={(e) => setDoneId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-[var(--tf-radius-xs)] text-xs"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          >
            <option value="">Selecione...</option>
            {colunas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>
            Coluna Doing
          </label>
          <select
            value={doingId}
            onChange={(e) => setDoingId(e.target.value)}
            className="w-full px-2.5 py-2 rounded-[var(--tf-radius-xs)] text-xs"
            style={{
              background: "var(--tf-bg)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          >
            <option value="">Selecione...</option>
            {colunas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={salvar}
        disabled={salvando}
        className="w-full px-4 py-2 rounded-[var(--tf-radius-md)] text-xs font-medium text-white transition-smooth"
        style={{ background: "var(--tf-accent)" }}
      >
        {salvando ? "Salvando..." : "Salvar configuração"}
      </button>

      <p className="text-[10px] leading-relaxed" style={{ color: "var(--tf-text-tertiary)" }}>
        No GitHub: Settings &rarr; Webhooks &rarr; Add webhook. Cole a URL e o secret acima.
        Content type: <code>application/json</code>. Selecione &ldquo;Pull requests&rdquo; como evento.
      </p>
    </div>
  );
}
