"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Key, Loader2, Plus, Terminal, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Workspace } from "@/types";

interface ApiKey {
  id: string;
  workspace_id: string;
  key_prefix: string;
  nome: string;
  ultimo_uso: string | null;
  criado_em: string;
  expires_at: string | null;
}

interface ApiKeysSectionProps {
  workspaces: Workspace[];
  /** Usuario autenticado — usado para disparar o fetch inicial. */
  userId?: string;
}

export function ApiKeysSection({ workspaces, userId }: ApiKeysSectionProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [criandoKey, setCriandoKey] = useState(false);
  const [novaKeyNome, setNovaKeyNome] = useState("Claude Code");
  const [novaKeyWs, setNovaKeyWs] = useState("");
  const [novaKeyCriada, setNovaKeyCriada] = useState<string | null>(null);
  const [novaKeyExpDays, setNovaKeyExpDays] = useState<string>("90");
  const [carregandoKeys, setCarregandoKeys] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    setCarregandoKeys(true);
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } finally {
      setCarregandoKeys(false);
    }
  }, []);

  useEffect(() => {
    if (userId) fetchApiKeys();
  }, [userId, fetchApiKeys]);

  async function criarApiKey() {
    if (!novaKeyWs) {
      toast.error("Selecione um workspace");
      return;
    }
    setCriandoKey(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaKeyNome,
          workspace_id: novaKeyWs,
          expires_in_days: novaKeyExpDays ? parseInt(novaKeyExpDays, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar key");
        return;
      }
      setNovaKeyCriada(data.key);
      toast.success("API Key criada!");
      fetchApiKeys();
    } finally {
      setCriandoKey(false);
    }
  }

  async function revogarApiKey(id: string) {
    const res = await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("API Key revogada");
      fetchApiKeys();
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          API Keys (MCP)
        </h2>
      </div>

      <div
        className="rounded-[var(--tf-radius-md)] p-6 space-y-4"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <p className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
          Use API keys para conectar o Taskflow ao Claude Code ou outras
          integrações.
        </p>

        {/* Key recem criada */}
        {novaKeyCriada && (
          <div
            className="rounded-[var(--tf-radius-md)] p-4 space-y-2"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
            }}
          >
            <p
              className="text-[11px] font-bold"
              style={{ color: "var(--tf-accent)" }}
            >
              Salve esta key — ela nao sera mostrada novamente!
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-[11px] px-3 py-2 rounded-[var(--tf-radius-xs)] break-all"
                style={{
                  background: "var(--tf-bg)",
                  color: "var(--tf-text)",
                }}
              >
                {novaKeyCriada}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(novaKeyCriada);
                  toast.success("Copiada!");
                }}
                className="p-2 rounded-[var(--tf-radius-xs)] shrink-0"
                style={{ color: "var(--tf-accent)" }}
              >
                <Copy size={14} />
              </button>
            </div>
            {/* Claude Code CLI config */}
            <div
              className="rounded-[var(--tf-radius-xs)] p-3 mt-2"
              style={{ background: "var(--tf-bg)" }}
            >
              <p
                className="text-[10px] font-bold mb-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Claude Code (CLI) — ~/.claude/settings.json:
              </p>
              <code
                className="text-[10px] break-all whitespace-pre-wrap"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                {`{
  "mcpServers": {
    "taskflow": {
      "type": "url",
      "url": "${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${novaKeyCriada}"
      }
    }
  }
}`}
              </code>
              <button
                onClick={() => {
                  const config = JSON.stringify(
                    {
                      mcpServers: {
                        taskflow: {
                          type: "url",
                          url: `${window.location.origin}/api/mcp`,
                          headers: {
                            Authorization: `Bearer ${novaKeyCriada}`,
                          },
                        },
                      },
                    },
                    null,
                    2
                  );
                  navigator.clipboard.writeText(config);
                  toast.success("Config copiada!");
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-[var(--tf-radius-xs)]"
                style={{ color: "var(--tf-accent)" }}
              >
                <Copy size={12} /> Copiar config CLI
              </button>
            </div>

            {/* Claude Desktop config */}
            <div
              className="rounded-[var(--tf-radius-xs)] p-3 mt-2"
              style={{ background: "var(--tf-bg)" }}
            >
              <p
                className="text-[10px] font-bold mb-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Claude Desktop — claude_desktop_config.json:
              </p>
              <code
                className="text-[10px] break-all whitespace-pre-wrap"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                {`{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp",
        "--header",
        "Authorization:Bearer ${novaKeyCriada}"
      ]
    }
  }
}`}
              </code>
              <button
                onClick={() => {
                  const config = JSON.stringify(
                    {
                      mcpServers: {
                        taskflow: {
                          command: "npx",
                          args: [
                            "-y",
                            "mcp-remote",
                            `${window.location.origin}/api/mcp`,
                            "--header",
                            `Authorization:Bearer ${novaKeyCriada}`,
                          ],
                        },
                      },
                    },
                    null,
                    2
                  );
                  navigator.clipboard.writeText(config);
                  toast.success("Config copiada!");
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-[var(--tf-radius-xs)]"
                style={{ color: "var(--tf-accent)" }}
              >
                <Copy size={12} /> Copiar config Desktop
              </button>
            </div>
            <button
              onClick={() => setNovaKeyCriada(null)}
              className="text-[11px] font-medium"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Formulario criar key */}
        {!novaKeyCriada && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={novaKeyNome}
              onChange={(e) => setNovaKeyNome(e.target.value)}
              placeholder="Nome da key..."
              className="flex-1 px-3 py-2 text-[12px] rounded-[var(--tf-radius-xs)] outline-none"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                color: "var(--tf-text)",
              }}
            />
            <select
              value={novaKeyWs}
              onChange={(e) => setNovaKeyWs(e.target.value)}
              className="px-3 py-2 text-[12px] rounded-[var(--tf-radius-xs)] outline-none"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                color: "var(--tf-text)",
              }}
            >
              <option value="">Workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.nome}
                </option>
              ))}
            </select>
            <select
              value={novaKeyExpDays}
              onChange={(e) => setNovaKeyExpDays(e.target.value)}
              className="px-3 py-2 text-[12px] rounded-[var(--tf-radius-xs)] outline-none"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                color: "var(--tf-text)",
              }}
            >
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="">Sem expiracao</option>
            </select>
            <button
              onClick={criarApiKey}
              disabled={criandoKey || !novaKeyWs}
              className="flex items-center gap-1 px-4 py-2 text-[12px] font-semibold text-white rounded-[var(--tf-radius-xs)] disabled:opacity-40"
              style={{ background: "var(--tf-accent)" }}
            >
              <Plus size={12} />
              {criandoKey ? "Gerando..." : "Gerar Key"}
            </button>
          </div>
        )}

        {/* Lista de keys existentes */}
        {carregandoKeys ? (
          <div className="flex justify-center py-4">
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: "var(--tf-text-tertiary)" }}
            />
          </div>
        ) : apiKeys.length > 0 ? (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--tf-radius-md)]"
                style={{ background: "var(--tf-surface)" }}
              >
                <Key size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-semibold truncate"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {key.nome}
                  </p>
                  <p
                    className="text-[10px] flex items-center gap-1 flex-wrap"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    <span>
                      {key.key_prefix}•••• ·{" "}
                      {workspaces.find((w) => w.id === key.workspace_id)?.nome ||
                        "Workspace"}
                      {key.ultimo_uso &&
                        ` · Usado ${new Date(key.ultimo_uso).toLocaleDateString("pt-BR")}`}
                    </span>
                    <ExpirationBadge expiresAt={key.expires_at} />
                  </p>
                </div>
                <button
                  onClick={() => revogarApiKey(key.id)}
                  className="p-1.5 rounded-[var(--tf-radius-xs)] shrink-0"
                  style={{ color: "var(--tf-danger)" }}
                  title="Revogar key"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-[11px] text-center py-4"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Nenhuma API key criada
          </p>
        )}
      </div>
    </section>
  );
}

function ExpirationBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;

  const now = new Date();
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase"
        style={{ color: "var(--tf-danger)", background: "var(--tf-danger-bg)" }}
      >
        Expirada
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-[4px]"
        style={{ color: "var(--tf-accent-yellow)", background: "var(--tf-warning-bg)" }}
      >
        Expira em {daysLeft}d
      </span>
    );
  }
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[4px]"
      style={{ color: "var(--tf-text-tertiary)", background: "var(--tf-surface)" }}
    >
      Expira em {daysLeft}d
    </span>
  );
}
