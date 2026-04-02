"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuadros } from "@/hooks/use-quadros";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  Github,
  Key,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Terminal } from "lucide-react";

export default function SettingsPage() {
  const { user, perfil, temGithub, logout, carregando, refresh, refreshGithub } = useAuth();
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const [conectandoGithub, setConectandoGithub] = useState(false);
  const [fotoGithub, setFotoGithub] = useState<string | null>(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // Workspaces (para API keys)
  const { workspaces } = useWorkspaces();

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; workspace_id: string; key_prefix: string; nome: string; ultimo_uso: string | null; criado_em: string }>>([]);
  const [criandoKey, setCriandoKey] = useState(false);
  const [novaKeyNome, setNovaKeyNome] = useState("Claude Code");
  const [novaKeyWs, setNovaKeyWs] = useState("");
  const [novaKeyCriada, setNovaKeyCriada] = useState<string | null>(null);
  const [carregandoKeys, setCarregandoKeys] = useState(false);

  // Buscar API keys
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
    if (user) fetchApiKeys();
  }, [user, fetchApiKeys]);

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
        body: JSON.stringify({ nome: novaKeyNome, workspace_id: novaKeyWs }),
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

  // PAT state
  const [mostrarPat, setMostrarPat] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [patVisivel, setPatVisivel] = useState(false);
  const [salvandoPat, setSalvandoPat] = useState(false);
  const [removendoPat, setRemovendoPat] = useState(false);

  // Theme
  const [tema, setTema] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTema(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Detectar foto do GitHub após conexão
  useEffect(() => {
    if (!user || !temGithub || perfil?.avatar_url) return;
    const githubIdentity = user.identities?.find((i) => i.provider === "github");
    const avatarUrl = githubIdentity?.identity_data?.avatar_url as string | undefined;
    if (avatarUrl) setFotoGithub(avatarUrl);
  }, [user, temGithub, perfil]);

  async function usarFotoGithub() {
    if (!user || !fotoGithub) return;
    setSalvandoFoto(true);
    const { error } = await supabase
      .from("perfis")
      .update({ avatar_url: fotoGithub })
      .eq("id", user.id);
    if (error) {
      toast.error("Não foi possível atualizar a foto.");
    } else {
      toast.success("Foto de perfil atualizada!");
      refresh();
    }
    setSalvandoFoto(false);
    setFotoGithub(null);
  }

  function toggleTema(t: "light" | "dark") {
    setTema(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function salvarPat() {
    if (!patInput.trim()) return;
    setSalvandoPat(true);
    try {
      const res = await fetch("/api/github-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: patInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar token");
        return;
      }
      toast.success(`Conectado como @${data.githubUser}`);
      if (data.warning) {
        toast.info(data.warning);
      }
      setPatInput("");
      setMostrarPat(false);
      refreshGithub();
      refresh();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSalvandoPat(false);
    }
  }

  async function removerToken() {
    setRemovendoPat(true);
    try {
      const res = await fetch("/api/github-token", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erro ao remover token");
        return;
      }
      toast.success("Token removido");
      refreshGithub();
      refresh();
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setRemovendoPat(false);
    }
  }

  async function conectarGithub() {
    setConectandoGithub(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        scopes: "repo",
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      },
    });
    if (error) {
      toast.error(error.message);
      setConectandoGithub(false);
    }
  }

  if (carregando) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--tf-bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ background: "var(--tf-bg)" }}>
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto rounded-[32px] mb-4 no-scrollbar"
          style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
        >
          <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
            {/* Page title */}
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
                Configurações
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                Gerencie seu perfil, conexões e preferências.
              </p>
            </div>

            {/* ── Profile ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <User size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Perfil
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex items-center gap-5">
                  {perfil?.avatar_url ? (
                    <img
                      src={perfil.avatar_url}
                      alt=""
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}
                    >
                      {(perfil?.nome ?? "?")[0].toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold truncate" style={{ color: "var(--tf-text)" }}>
                      {perfil?.nome ?? "Sem nome"}
                    </p>
                    <p className="text-[13px] truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                      {user?.email}
                    </p>
                    {perfil?.github_username && (
                      <p className="text-[13px] mt-0.5 font-medium" style={{ color: "var(--tf-text-secondary)" }}>
                        @{perfil.github_username}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── GitHub ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Github size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  GitHub
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                {temGithub ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "var(--tf-success-bg)" }}
                      >
                        <Check size={16} style={{ color: "var(--tf-success)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                          Conta conectada
                        </p>
                        {perfil?.github_username && (
                          <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                            @{perfil.github_username}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={removerToken}
                        disabled={removendoPat}
                        title="Desconectar GitHub"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
                        style={{ color: "var(--tf-danger)", background: "var(--tf-danger-bg)" }}
                      >
                        {removendoPat ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Desconectar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
                      Conecte sua conta GitHub para criar PRs, navegar repositórios e fazer merge diretamente pelo Taskflow.
                    </p>

                    {/* OAuth button */}
                    <button
                      onClick={conectarGithub}
                      disabled={conectandoGithub}
                      className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150 hover:opacity-80 disabled:opacity-50"
                      style={{ background: "var(--tf-surface)", color: "var(--tf-text)", border: "1px solid var(--tf-border)" }}
                    >
                      {conectandoGithub ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Github size={14} />
                      )}
                      Conectar com GitHub
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: "var(--tf-border)" }} />
                      <span className="text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>ou</span>
                      <div className="flex-1 h-px" style={{ background: "var(--tf-border)" }} />
                    </div>

                    {/* PAT toggle */}
                    {!mostrarPat ? (
                      <button
                        onClick={() => setMostrarPat(true)}
                        className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150 hover:opacity-80"
                        style={{ color: "var(--tf-text-secondary)", border: "1px dashed var(--tf-border)" }}
                      >
                        <Key size={14} />
                        Usar Personal Access Token
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type={patVisivel ? "text" : "password"}
                            value={patInput}
                            onChange={(e) => setPatInput(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            maxLength={200}
                            autoComplete="off"
                            spellCheck={false}
                            className="w-full px-4 py-2.5 pr-10 rounded-[14px] text-[13px] font-mono outline-none transition-all"
                            style={{
                              background: "var(--tf-surface)",
                              color: "var(--tf-text)",
                              border: "1px solid var(--tf-border)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setPatVisivel(!patVisivel)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                            style={{ color: "var(--tf-text-tertiary)" }}
                          >
                            {patVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>

                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--tf-text-tertiary)" }}>
                          Gere em{" "}
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=Taskflow"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: "var(--tf-accent)" }}
                          >
                            GitHub Settings → Tokens
                          </a>
                          {" "}com permissão <strong>repo</strong>. Seu token é salvo de forma segura e nunca exposto.
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={salvarPat}
                            disabled={salvandoPat || !patInput.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                            style={{ background: "var(--tf-accent)" }}
                          >
                            {salvandoPat ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                            Conectar
                          </button>
                          <button
                            onClick={() => { setMostrarPat(false); setPatInput(""); }}
                            className="px-4 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150 hover:opacity-80"
                            style={{ color: "var(--tf-text-tertiary)", border: "1px solid var(--tf-border)" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ── Foto do GitHub (banner condicional) ── */}
            {fotoGithub && (
              <section>
                <div
                  className="rounded-[20px] p-6 flex items-center gap-5"
                  style={{ background: "var(--tf-accent-light)", border: "1px solid var(--tf-accent)" }}
                >
                  <div className="relative shrink-0">
                    <img
                      src={fotoGithub}
                      alt="Foto do GitHub"
                      className="w-14 h-14 rounded-full object-cover"
                      style={{ border: "2px solid var(--tf-accent)" }}
                    />
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      <Camera size={11} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: "var(--tf-accent-text)" }}>
                      Usar foto do GitHub?
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-secondary)" }}>
                      Encontramos sua foto de perfil do GitHub.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={usarFotoGithub}
                      disabled={salvandoFoto}
                      className="px-4 py-2 rounded-[14px] text-[12px] font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-50"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      {salvandoFoto ? "Salvando..." : "Usar"}
                    </button>
                    <button
                      onClick={() => setFotoGithub(null)}
                      className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
                      style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Aparência ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Aparência
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex gap-3">
                  {([
                    { id: "light" as const, label: "Claro", icon: Sun },
                    { id: "dark" as const, label: "Escuro", icon: Moon },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => toggleTema(id)}
                      className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150"
                      style={{
                        background: tema === id ? "var(--tf-surface)" : "transparent",
                        color: tema === id ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                        border: tema === id ? "1px solid var(--tf-border)" : "1px solid transparent",
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Segurança ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  Segurança
                </h2>
              </div>

              <div
                className="rounded-[20px] p-6"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                      Sair da conta
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                      Encerrar sessão neste dispositivo.
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[12px] font-semibold transition-all duration-150 hover:opacity-80"
                    style={{ color: "var(--tf-danger)", background: "var(--tf-danger-bg)" }}
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              </div>
            </section>

            {/* ── API Keys (MCP) ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Terminal size={14} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                  API Keys (MCP)
                </h2>
              </div>

              <div className="rounded-[20px] p-6 space-y-4" style={{ background: "var(--tf-bg-secondary)" }}>
                <p className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
                  Use API keys para conectar o Taskflow ao Claude Code ou outras integrações.
                </p>

                {/* Key recem criada */}
                {novaKeyCriada && (
                  <div className="rounded-[14px] p-4 space-y-2" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-accent)" }}>
                    <p className="text-[11px] font-bold" style={{ color: "var(--tf-accent)" }}>
                      Salve esta key — ela nao sera mostrada novamente!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] px-3 py-2 rounded-[8px] break-all" style={{ background: "var(--tf-bg)", color: "var(--tf-text)" }}>
                        {novaKeyCriada}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(novaKeyCriada); toast.success("Copiada!"); }}
                        className="p-2 rounded-[8px] shrink-0"
                        style={{ color: "var(--tf-accent)" }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {/* Claude Code CLI config */}
                    <div className="rounded-[10px] p-3 mt-2" style={{ background: "var(--tf-bg)" }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: "var(--tf-text-tertiary)" }}>Claude Code (CLI) — ~/.claude/settings.json:</p>
                      <code className="text-[10px] break-all whitespace-pre-wrap" style={{ color: "var(--tf-text-secondary)" }}>
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
                          const config = JSON.stringify({
                            mcpServers: {
                              taskflow: {
                                type: "url",
                                url: `${window.location.origin}/api/mcp`,
                                headers: { Authorization: `Bearer ${novaKeyCriada}` },
                              },
                            },
                          }, null, 2);
                          navigator.clipboard.writeText(config);
                          toast.success("Config copiada!");
                        }}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px]"
                        style={{ color: "var(--tf-accent)" }}
                      >
                        <Copy size={12} /> Copiar config CLI
                      </button>
                    </div>

                    {/* Claude Desktop config */}
                    <div className="rounded-[10px] p-3 mt-2" style={{ background: "var(--tf-bg)" }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: "var(--tf-text-tertiary)" }}>Claude Desktop — claude_desktop_config.json:</p>
                      <code className="text-[10px] break-all whitespace-pre-wrap" style={{ color: "var(--tf-text-secondary)" }}>
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
                          const config = JSON.stringify({
                            mcpServers: {
                              taskflow: {
                                command: "npx",
                                args: [
                                  "-y", "mcp-remote",
                                  `${window.location.origin}/api/mcp`,
                                  "--header",
                                  `Authorization:Bearer ${novaKeyCriada}`,
                                ],
                              },
                            },
                          }, null, 2);
                          navigator.clipboard.writeText(config);
                          toast.success("Config copiada!");
                        }}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-[8px]"
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
                      className="flex-1 px-3 py-2 text-[12px] rounded-[10px] outline-none"
                      style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                    />
                    <select
                      value={novaKeyWs}
                      onChange={(e) => setNovaKeyWs(e.target.value)}
                      className="px-3 py-2 text-[12px] rounded-[10px] outline-none"
                      style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                    >
                      <option value="">Workspace...</option>
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={criarApiKey}
                      disabled={criandoKey || !novaKeyWs}
                      className="flex items-center gap-1 px-4 py-2 text-[12px] font-semibold text-white rounded-[10px] disabled:opacity-40"
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
                    <Loader2 size={16} className="animate-spin" style={{ color: "var(--tf-text-tertiary)" }} />
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
                        style={{ background: "var(--tf-surface)" }}
                      >
                        <Key size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: "var(--tf-text)" }}>
                            {key.nome}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                            {key.key_prefix}•••• · {workspaces.find(w => w.id === key.workspace_id)?.nome || "Workspace"}
                            {key.ultimo_uso && ` · Usado ${new Date(key.ultimo_uso).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                        <button
                          onClick={() => revogarApiKey(key.id)}
                          className="p-1.5 rounded-[8px] shrink-0"
                          style={{ color: "var(--tf-danger)" }}
                          title="Revogar key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-center py-4" style={{ color: "var(--tf-text-tertiary)" }}>
                    Nenhuma API key criada
                  </p>
                )}
              </div>
            </section>

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </main>
      </div>
    </div>
  );
}
