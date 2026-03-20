"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Modal } from "@/components/ui/modal";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Workspace } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Grid3X3,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";

const CORES_QUADRO = [
  "#C4841D", "#3D8B37", "#B04632", "#2E86AB",
  "#89609E", "#CD5A91", "#00857C", "#D4732A",
  "#6B6560", "#2D2A26",
];

const CORES_WORKSPACE = [
  "#C4841D", "#3D8B37", "#2E86AB", "#89609E",
  "#B04632", "#CD5A91", "#00857C", "#6B6560",
];

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function PaginaInicial() {
  const { quadros, carregando: carregandoQuadros, criar: criarQuadro, excluir: excluirQuadro } = useQuadros();
  const { workspaces, carregando: carregandoWs, criar: criarWorkspace, atualizar: atualizarWorkspace, excluir: excluirWorkspace } = useWorkspaces();

  const [modalQuadro, setModalQuadro] = useState(false);
  const [modalWorkspace, setModalWorkspace] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_QUADRO[0]);
  const [novoWorkspaceId, setNovoWorkspaceId] = useState<string>("");
  const [novoDataInicio, setNovoDataInicio] = useState("");
  const [novoDataFim, setNovoDataFim] = useState("");
  const [novoMeta, setNovoMeta] = useState("");

  const [wsNome, setWsNome] = useState("");
  const [wsDescricao, setWsDescricao] = useState("");
  const [wsCor, setWsCor] = useState(CORES_WORKSPACE[0]);

  // Editar workspace
  const [editandoWs, setEditandoWs] = useState<Workspace | null>(null);

  const [secoesFechadas, setSecoesFechadas] = useState<Set<string>>(new Set());
  const [sidebarAberta, setSidebarAberta] = useState(true);

  const router = useRouter();
  const carregando = carregandoQuadros || carregandoWs;

  // Quadros agrupados por workspace
  const quadrosPorWorkspace = useMemo(() => {
    const mapa: Record<string, typeof quadros> = {};
    for (const ws of workspaces) {
      mapa[ws.id] = quadros.filter((q) => q.workspace_id === ws.id);
    }
    return mapa;
  }, [quadros, workspaces]);

  const quadrosAvulsos = useMemo(
    () => quadros.filter((q) => !q.workspace_id),
    [quadros]
  );

  // Recentes: últimos 4 por atualizado_em
  const recentes = useMemo(
    () => [...quadros].sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()).slice(0, 4),
    [quadros]
  );

  function toggleSecao(id: string) {
    setSecoesFechadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCriarQuadro() {
    const nome = novoNome.trim();
    if (!nome) return;

    const quadro = await criarQuadro({
      nome,
      cor: novaCor,
      workspaceId: novoWorkspaceId || undefined,
      dataInicio: novoDataInicio || undefined,
      dataFim: novoDataFim || undefined,
      statusSprint: novoWorkspaceId ? "planejada" : undefined,
      meta: novoMeta.trim() || undefined,
    });

    if (quadro) {
      setModalQuadro(false);
      setNovoNome(""); setNovaCor(CORES_QUADRO[0]); setNovoWorkspaceId("");
      setNovoDataInicio(""); setNovoDataFim(""); setNovoMeta("");
      router.push(`/quadro/${quadro.id}`);
    }
  }

  async function handleCriarWorkspace() {
    const nome = wsNome.trim();
    if (!nome) return;
    await criarWorkspace(nome, wsDescricao.trim() || undefined, wsCor);
    setModalWorkspace(false);
    setWsNome("");
    setWsDescricao("");
    setWsCor(CORES_WORKSPACE[0]);
  }

  async function handleSalvarWorkspace() {
    if (!editandoWs) return;
    await atualizarWorkspace(editandoWs.id, {
      nome: wsNome.trim() || editandoWs.nome,
      descricao: wsDescricao.trim() || null,
      cor: wsCor,
    });
    setEditandoWs(null);
    setWsNome("");
    setWsDescricao("");
    setWsCor(CORES_WORKSPACE[0]);
  }

  function abrirEditarWs(ws: Workspace) {
    setWsNome(ws.nome);
    setWsDescricao(ws.descricao || "");
    setWsCor(ws.cor);
    setEditandoWs(ws);
  }

  // Card de quadro reutilizável
  function QuadroCard({ quadro }: { quadro: typeof quadros[0] }) {
    return (
      <button
        onClick={() => router.push(`/quadro/${quadro.id}`)}
        className="group text-left rounded-xl overflow-hidden h-[88px] relative transition-smooth hover:shadow-lg hover:scale-[1.02]"
        style={{ background: `linear-gradient(145deg, ${quadro.cor}, ${quadro.cor}bb)` }}
      >
        <div className="absolute inset-0 p-3 flex flex-col justify-between">
          <h3 className="text-white font-bold text-[13px] leading-snug line-clamp-2 drop-shadow-sm">
            {quadro.nome}
          </h3>
          <p className="text-white/50 text-[10px]">
            {new Date(quadro.atualizado_em).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-smooth rounded-xl" />
      </button>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => setModalQuadro(true)}
          aberta={sidebarAberta}
          onToggle={() => setSidebarAberta(!sidebarAberta)}
        />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--tf-bg)" }}>
          <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--tf-text)" }}>
                  {saudacao()} 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                  {quadros.length} {quadros.length === 1 ? "quadro" : "quadros"} · {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalWorkspace(true)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-lg transition-smooth border"
                  style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)", background: "var(--tf-surface)" }}
                >
                  <Layers size={15} />
                  Workspace
                </button>
                <button
                  onClick={() => setModalQuadro(true)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-white rounded-lg transition-smooth"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Plus size={15} />
                  Novo Quadro
                </button>
              </div>
            </div>

            {carregando ? (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <>
                {/* ── RECENTES ── */}
                {recentes.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={15} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Acessados recentemente
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {recentes.map((q) => <QuadroCard key={q.id} quadro={q} />)}
                    </div>
                  </section>
                )}

                {/* ── WORKSPACES ── */}
                {workspaces.map((ws) => {
                  const wsQuadros = quadrosPorWorkspace[ws.id] || [];
                  const fechada = secoesFechadas.has(ws.id);

                  return (
                    <section key={ws.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => toggleSecao(ws.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 group"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                            style={{ background: ws.cor }}
                            onClick={(e) => { e.stopPropagation(); router.push(`/workspace/${ws.id}`); }}
                            title="Abrir workspace"
                          >
                            <Folder size={14} className="text-white" />
                          </div>
                          <h2
                            className="text-[14px] font-bold truncate hover:underline cursor-pointer"
                            style={{ color: "var(--tf-text)" }}
                            onClick={(e) => { e.stopPropagation(); router.push(`/workspace/${ws.id}`); }}
                          >
                            {ws.nome}
                          </h2>
                          <span className="text-[12px] font-normal" style={{ color: "var(--tf-text-tertiary)" }}>
                            {wsQuadros.length}
                          </span>
                          {fechada ? (
                            <ChevronRight size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                          ) : (
                            <ChevronDown size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                          )}
                        </button>

                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-lg transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}>
                              <MoreHorizontal size={16} />
                            </button>
                          }
                        >
                          <DropdownItem onClick={() => abrirEditarWs(ws)}>
                            <Pencil size={14} />
                            Editar workspace
                          </DropdownItem>
                          <DropdownItem onClick={() => { setNovoWorkspaceId(ws.id); setModalQuadro(true); }}>
                            <Plus size={14} />
                            Novo quadro aqui
                          </DropdownItem>
                          <DropdownItem perigo onClick={() => excluirWorkspace(ws.id)}>
                            <Trash2 size={14} />
                            Excluir workspace
                          </DropdownItem>
                        </Dropdown>
                      </div>

                      {ws.descricao && !fechada && (
                        <p className="text-[12px] mb-3 -mt-1 ml-9" style={{ color: "var(--tf-text-tertiary)" }}>
                          {ws.descricao}
                        </p>
                      )}

                      {!fechada && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ml-9">
                          {wsQuadros.map((q) => <QuadroCard key={q.id} quadro={q} />)}
                          <button
                            onClick={() => { setNovoWorkspaceId(ws.id); setModalQuadro(true); }}
                            className="rounded-xl h-[88px] flex items-center justify-center text-[13px] border-2 border-dashed transition-smooth hover:border-solid"
                            style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}

                {/* ── QUADROS AVULSOS ── */}
                {quadrosAvulsos.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Grid3X3 size={15} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Quadros
                      </h2>
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                        {quadrosAvulsos.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {quadrosAvulsos.map((q) => <QuadroCard key={q.id} quadro={q} />)}
                      <button
                        onClick={() => { setNovoWorkspaceId(""); setModalQuadro(true); }}
                        className="rounded-xl h-[88px] flex items-center justify-center text-[13px] border-2 border-dashed transition-smooth hover:border-solid"
                        style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Plus size={18} />
                          <span>Novo quadro</span>
                        </div>
                      </button>
                    </div>
                  </section>
                )}

                {/* Empty state */}
                {quadros.length === 0 && workspaces.length === 0 && (
                  <div className="text-center py-20">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: "var(--tf-bg-secondary)" }}
                    >
                      <Layers size={28} style={{ color: "var(--tf-text-tertiary)" }} />
                    </div>
                    <h2 className="text-lg font-bold mb-1" style={{ color: "var(--tf-text)" }}>
                      Comece criando um workspace
                    </h2>
                    <p className="text-sm mb-6" style={{ color: "var(--tf-text-tertiary)" }}>
                      Organize seus projetos em workspaces e quadros
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setModalWorkspace(true)}
                        className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth"
                        style={{ background: "var(--tf-accent)" }}
                      >
                        Criar workspace
                      </button>
                      <button
                        onClick={() => setModalQuadro(true)}
                        className="px-5 py-2.5 text-sm font-medium rounded-lg transition-smooth border"
                        style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)" }}
                      >
                        Criar quadro avulso
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODAL: Novo Quadro ── */}
      <Modal
        aberto={modalQuadro}
        onFechar={() => { setModalQuadro(false); setNovoNome(""); setNovoWorkspaceId(""); setNovoDataInicio(""); setNovoDataFim(""); setNovoMeta(""); }}
        titulo={novoWorkspaceId ? "Criar sprint" : "Criar quadro"}
      >
        <div className="space-y-4">
          <div
            className="h-24 rounded-xl flex items-end p-4"
            style={{ background: `linear-gradient(145deg, ${novaCor}, ${novaCor}bb)` }}
          >
            <span className="text-white font-bold text-lg drop-shadow-sm">
              {novoNome || "Nome do quadro"}
            </span>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Título</label>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCriarQuadro(); }}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              autoFocus
            />
          </div>

          {workspaces.length > 0 && (
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Workspace</label>
              <select
                value={novoWorkspaceId}
                onChange={(e) => setNovoWorkspaceId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              >
                <option value="">Nenhum (quadro avulso)</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campos de sprint — aparecem quando workspace selecionado */}
          {novoWorkspaceId && (
            <>
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Meta / Objetivo (opcional)</label>
                <input
                  value={novoMeta}
                  onChange={(e) => setNovoMeta(e.target.value)}
                  placeholder="O que queremos alcançar nessa sprint?"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                  style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Data Início</label>
                  <input
                    type="date"
                    value={novoDataInicio}
                    onChange={(e) => setNovoDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                    style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Data Fim</label>
                  <input
                    type="date"
                    value={novoDataFim}
                    onChange={(e) => setNovoDataFim(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                    style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_QUADRO.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setNovaCor(cor)}
                  className={`w-9 h-7 rounded-lg transition-smooth ${novaCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleCriarQuadro}
            disabled={!novoNome.trim()}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-40"
            style={{ background: "var(--tf-accent)" }}
          >
            {novoWorkspaceId ? "Criar sprint" : "Criar quadro"}
          </button>
        </div>
      </Modal>

      {/* ── MODAL: Novo / Editar Workspace ── */}
      <Modal
        aberto={modalWorkspace || !!editandoWs}
        onFechar={() => { setModalWorkspace(false); setEditandoWs(null); setWsNome(""); setWsDescricao(""); }}
        titulo={editandoWs ? "Editar workspace" : "Criar workspace"}
      >
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--tf-bg-secondary)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: wsCor }}>
              <Folder size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: "var(--tf-text)" }}>{wsNome || "Nome do workspace"}</p>
              {wsDescricao && <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>{wsDescricao}</p>}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Nome</label>
            <input
              value={wsNome}
              onChange={(e) => setWsNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") editandoWs ? handleSalvarWorkspace() : handleCriarWorkspace(); }}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Descrição (opcional)</label>
            <input
              value={wsDescricao}
              onChange={(e) => setWsDescricao(e.target.value)}
              placeholder="Ex: Projeto de pesquisa em áudio"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_WORKSPACE.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setWsCor(cor)}
                  className={`w-9 h-7 rounded-lg transition-smooth ${wsCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={editandoWs ? handleSalvarWorkspace : handleCriarWorkspace}
            disabled={!wsNome.trim()}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-40"
            style={{ background: "var(--tf-accent)" }}
          >
            {editandoWs ? "Salvar" : "Criar workspace"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
