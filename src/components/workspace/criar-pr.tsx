"use client";

import { Modal } from "@/components/ui/modal";
import { GitPullRequest, Loader2, ChevronDown, ExternalLink, Check, LinkIcon, Users, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { GitHubBranch } from "@/types/github";
import type { Membro } from "@/types";

interface CardOption {
  id: string;
  titulo: string;
  coluna_nome: string | null;
}

interface CriarPRProps {
  aberto: boolean;
  onFechar: () => void;
  repoId: string;
  owner: string;
  nome: string;
  workspaceId?: string;
  membros?: Membro[];
}

export function CriarPR({ aberto, onFechar, repoId, owner, nome, workspaceId, membros = [] }: CriarPRProps) {
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [carregandoBranches, setCarregandoBranches] = useState(false);
  const [head, setHead] = useState("");
  const [base, setBase] = useState("main");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ number: number; html_url: string } | null>(null);

  // Card association
  const [cards, setCards] = useState<CardOption[]>([]);
  const [carregandoCards, setCarregandoCards] = useState(false);
  const [cardSelecionado, setCardSelecionado] = useState<string | null>(null);
  const [mostrarCards, setMostrarCards] = useState(false);

  // Reviewers
  const [reviewersSelecionados, setReviewersSelecionados] = useState<string[]>([]);
  const [mostrarReviewers, setMostrarReviewers] = useState(false);

  // Membros com GitHub (para reviewer selection) — deduplicar por user_id
  const membrosComGithub = membros.filter((m) => !!m.user_id)
    .filter((m, i, arr) => arr.findIndex((x) => x.user_id === m.user_id) === i);

  // Buscar branches quando abre o modal
  useEffect(() => {
    if (!aberto) {
      setHead("");
      setBase("main");
      setTitulo("");
      setDescricao("");
      setErro(null);
      setSucesso(null);
      setCardSelecionado(null);
      setReviewersSelecionados([]);
      setMostrarCards(false);
      setMostrarReviewers(false);
      return;
    }

    setCarregandoBranches(true);
    fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo: nome }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) {
          setBranches(data.branches);
          const def = data.branches.find((b: GitHubBranch) => b.name === "main")
            || data.branches.find((b: GitHubBranch) => b.name === "master");
          if (def) setBase(def.name);
        }
        if (data.error) setErro(data.error);
      })
      .catch(() => setErro("Erro ao carregar branches"))
      .finally(() => setCarregandoBranches(false));

    // Buscar cards do workspace
    if (workspaceId) {
      setCarregandoCards(true);
      (async () => {
        // Buscar quadros (sprints) do workspace
        const { data: quadros } = await supabase
          .from("quadros")
          .select("id")
          .eq("workspace_id", workspaceId);

        const quadroIds = (quadros || []).map((q) => q.id);

        if (quadroIds.length === 0) {
          setCarregandoCards(false);
          return;
        }

        // Buscar colunas desses quadros
        const { data: colunas } = await supabase
          .from("colunas")
          .select("id")
          .in("quadro_id", quadroIds);

        const colunaIds = (colunas || []).map((c) => c.id);

        if (colunaIds.length === 0) {
          setCarregandoCards(false);
          return;
        }

        // Buscar cards nessas colunas sem PR vinculado
        const { data } = await supabase
          .from("cartoes")
          .select("id, titulo")
          .in("coluna_id", colunaIds)
          .is("pr_numero", null)
          .order("atualizado_em", { ascending: false })
          .limit(100);

        // Também buscar cards com workspace_id direto (backlog)
        const { data: backlogCards } = await supabase
          .from("cartoes")
          .select("id, titulo")
          .eq("workspace_id", workspaceId)
          .is("coluna_id", null)
          .is("pr_numero", null)
          .order("atualizado_em", { ascending: false })
          .limit(50);

        const todos = [...(data || []), ...(backlogCards || [])];
        // Deduplicar por id
        const vistos = new Set<string>();
        const unicos = todos.filter((c) => {
          if (vistos.has(c.id)) return false;
          vistos.add(c.id);
          return true;
        });

        setCards(unicos.map((c) => ({ id: c.id, titulo: c.titulo, coluna_nome: null })));
        setCarregandoCards(false);
      })();
    }
  }, [aberto, owner, nome, workspaceId, membros]);

  async function handleCriar() {
    if (!head || !base || !titulo.trim()) return;
    if (head === base) {
      setErro("Branch de origem e destino não podem ser iguais");
      return;
    }

    setCriando(true);
    setErro(null);

    try {
      // Buscar github usernames dos reviewers selecionados
      let reviewerUsernames: string[] = [];
      if (reviewersSelecionados.length > 0) {
        const { data: perfis } = await supabase
          .from("perfis")
          .select("id, github_username")
          .in("id", reviewersSelecionados);
        reviewerUsernames = (perfis || [])
          .filter((p) => p.github_username)
          .map((p) => p.github_username!);
      }

      const res = await fetch("/api/pr-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId,
          title: titulo.trim(),
          head,
          base,
          body: descricao.trim() || undefined,
          cardId: cardSelecionado || undefined,
          reviewers: reviewerUsernames.length > 0 ? reviewerUsernames : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao criar PR");
        return;
      }

      setSucesso(data.pr);
    } catch {
      setErro("Erro de conexão");
    } finally {
      setCriando(false);
    }
  }

  const branchesDisponiveis = branches.filter((b) => b.name !== base);
  const cardEscolhido = cards.find((c) => c.id === cardSelecionado);

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Criar Pull Request" className="max-w-lg">
      {sucesso ? (
        <div className="text-center py-4 space-y-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--tf-success, #22c55e)20" }}
          >
            <GitPullRequest size={28} style={{ color: "var(--tf-success, #22c55e)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--tf-text)" }}>
              PR #{sucesso.number} criado com sucesso!
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--tf-text-secondary)" }}>
              {cardSelecionado
                ? "O card foi vinculado e movido para Review."
                : "Um card foi criado automaticamente na coluna Review."}
            </p>
            {reviewersSelecionados.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                {reviewersSelecionados.length} reviewer(s) solicitado(s).
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <a
              href={sucesso.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white"
              style={{ background: "var(--tf-accent)" }}
            >
              <ExternalLink size={13} /> Ver no GitHub
            </a>
            <button
              onClick={onFechar}
              className="px-4 py-2 text-xs font-semibold rounded-lg"
              style={{ color: "var(--tf-text-secondary)", border: "1px solid var(--tf-border)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Repo info */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
            <GitPullRequest size={14} />
            <span className="font-medium">{owner}/{nome}</span>
          </div>

          {/* Branch de origem (head) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Branch de origem
            </label>
            {carregandoBranches ? (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={14} className="animate-spin" /> Carregando branches...
              </div>
            ) : (
              <div className="relative">
                <select
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full appearance-none text-sm px-3 py-2 rounded-lg border pr-8"
                  style={{
                    background: "var(--tf-bg)",
                    borderColor: "var(--tf-border)",
                    color: head ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                  }}
                >
                  <option value="">Selecione a branch...</option>
                  {branchesDisponiveis.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--tf-text-tertiary)" }} />
              </div>
            )}
          </div>

          {/* Branch destino (base) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Branch destino
            </label>
            <div className="relative">
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full appearance-none text-sm px-3 py-2 rounded-lg border pr-8"
                style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)", color: "var(--tf-text)" }}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--tf-text-tertiary)" }} />
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Título do PR
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: feat: adicionar autenticação OAuth"
              className="w-full text-sm px-3 py-2 rounded-lg border"
              style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)", color: "var(--tf-text)" }}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Descrição <span style={{ color: "var(--tf-text-tertiary)" }}>(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as mudanças..."
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
              style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)", color: "var(--tf-text)" }}
            />
          </div>

          {/* ─── Card vinculado (opcional) ─── */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              <LinkIcon size={12} className="inline mr-1" />
              Vincular a um card <span style={{ color: "var(--tf-text-tertiary)" }}>(opcional — será movido para Review)</span>
            </label>
            {cardEscolhido ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: "var(--tf-bg)", borderColor: "var(--tf-accent)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--tf-text)" }}>{cardEscolhido.titulo}</p>
                  {cardEscolhido.coluna_nome && (
                    <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{cardEscolhido.coluna_nome}</p>
                  )}
                </div>
                <button onClick={() => setCardSelecionado(null)} className="p-1 rounded" style={{ color: "var(--tf-text-tertiary)" }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMostrarCards(!mostrarCards)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg border"
                  style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
                >
                  {carregandoCards ? "Carregando cards..." : "Selecionar card..."}
                </button>
                {mostrarCards && (
                  <div
                    className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg"
                    style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)", scrollbarWidth: "thin" }}
                  >
                    {cards.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--tf-text-tertiary)" }}>
                        Nenhum card disponível
                      </p>
                    ) : (
                      cards.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCardSelecionado(c.id); setMostrarCards(false); }}
                          className="w-full text-left px-3 py-2 text-sm transition-smooth"
                          style={{ color: "var(--tf-text)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <p className="font-medium truncate">{c.titulo}</p>
                          {c.coluna_nome && (
                            <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{c.coluna_nome}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Reviewers (opcional) ─── */}
          {membrosComGithub.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
                <Users size={12} className="inline mr-1" />
                Reviewers <span style={{ color: "var(--tf-text-tertiary)" }}>(opcional)</span>
              </label>

              {/* Selected reviewers */}
              {reviewersSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {reviewersSelecionados.map((userId) => {
                    const m = membros.find((mb) => mb.user_id === userId);
                    if (!m) return null;
                    return (
                      <span
                        key={userId}
                        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md"
                        style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
                      >
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                        ) : null}
                        {m.nome}
                        <button
                          onClick={() => setReviewersSelecionados((prev) => prev.filter((id) => id !== userId))}
                          className="ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setMostrarReviewers(!mostrarReviewers)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border"
                style={{ background: "var(--tf-bg)", borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
              >
                Adicionar reviewer...
              </button>

              {mostrarReviewers && (
                <div
                  className="mt-1 max-h-40 overflow-y-auto rounded-lg border"
                  style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)", scrollbarWidth: "thin" }}
                >
                  {membrosComGithub
                    .filter((m) => !reviewersSelecionados.includes(m.user_id!))
                    .map((m) => (
                      <button
                        key={m.user_id}
                        onClick={() => {
                          setReviewersSelecionados((prev) => [...prev, m.user_id!]);
                          setMostrarReviewers(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-smooth"
                        style={{ color: "var(--tf-text)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: m.cor_avatar }}>
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{m.nome}</span>
                        {m.email && (
                          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{m.email}</span>
                        )}
                      </button>
                    ))}
                  {membrosComGithub.filter((m) => !reviewersSelecionados.includes(m.user_id!)).length === 0 && (
                    <p className="text-xs py-3 text-center" style={{ color: "var(--tf-text-tertiary)" }}>Todos já selecionados</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>
              {erro}
            </div>
          )}

          {/* Botão criar */}
          <button
            onClick={handleCriar}
            disabled={criando || !head || !titulo.trim() || carregandoBranches}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--tf-accent)" }}
          >
            {criando ? (
              <><Loader2 size={15} className="animate-spin" /> Criando...</>
            ) : (
              <><GitPullRequest size={15} /> Criar Pull Request</>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
}
