"use client";

import { useState } from "react";
import {
  GitPullRequest,
  GitMerge,
  ExternalLink,
  CircleDot,
  XCircle,
  FileEdit,
  GitBranch,
  ArrowRight,
  Inbox,
  Plus,
  RefreshCw,
} from "lucide-react";
import { CriarPR } from "./criar-pr";
import { PRDetalhe } from "./pr-detalhe";
import useSWR from "swr";
import type { GitHubPR } from "@/types/github";


interface RepoPRsProps {
  owner: string;
  nome: string;
  repoId?: string;
  workspaceId?: string;
  membros?: import("@/types").Membro[];
}

type Aba = "open" | "closed" | "all";

// Hook que usa API autenticada (funciona com repos privados)
function usePRsAuth(owner: string, nome: string, state: Aba) {
  const { data, isLoading, mutate } = useSWR<{ prs: GitHubPR[] }>(
    owner && nome ? `prs-auth-${owner}-${nome}-${state}` : null,
    async () => {
      const res = await fetch("/api/prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo: nome, state }),
      });
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { prs: data?.prs || [], carregando: isLoading, revalidar: () => mutate() };
}

function tempoAtras(date: string): string {
  const agora = Date.now();
  const alvo = new Date(date).getTime();
  const diff = agora - alvo;

  const segundos = Math.floor(diff / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  const semanas = Math.floor(dias / 7);
  const meses = Math.floor(dias / 30);
  const anos = Math.floor(dias / 365);

  if (anos > 0) return `${anos}a atrás`;
  if (meses > 0) return `${meses}m atrás`;
  if (semanas > 0) return `${semanas}sem atrás`;
  if (dias > 0) return `${dias}d atrás`;
  if (horas > 0) return `${horas}h atrás`;
  if (minutos > 0) return `${minutos}min atrás`;
  return "agora";
}

function obterStatus(pr: GitHubPR): {
  label: string;
  cor: string;
  icone: React.ReactNode;
} {
  if (pr.merged_at) {
    return {
      label: "Merged",
      cor: "#8b5cf6",
      icone: <GitMerge size={14} />,
    };
  }
  if (pr.state === "closed") {
    return {
      label: "Fechada",
      cor: "var(--tf-danger)",
      icone: <XCircle size={14} />,
    };
  }
  return {
    label: "Aberta",
    cor: "var(--tf-success)",
    icone: <CircleDot size={14} />,
  };
}

function obterDataReferencia(pr: GitHubPR): string {
  if (pr.merged_at) return tempoAtras(pr.merged_at);
  if (pr.closed_at) return tempoAtras(pr.closed_at);
  return tempoAtras(pr.created_at);
}

function SkeletonItem() {
  return (
    <div
      className="px-4 py-3.5 flex flex-col gap-2"
      style={{ borderBottom: "1px solid var(--tf-border)" }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-[50px] h-3.5 rounded-[4px] opacity-50 animate-pulse"
          style={{ background: "var(--tf-border)" }}
        />
        <div
          className="w-[60%] h-4 rounded-[4px] opacity-50 animate-pulse"
          style={{ background: "var(--tf-border)" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-full opacity-50 animate-pulse"
          style={{ background: "var(--tf-border)" }}
        />
        <div
          className="w-20 h-3 rounded-[4px] opacity-50 animate-pulse"
          style={{ background: "var(--tf-border)" }}
        />
      </div>
    </div>
  );
}

function PRItem({ pr, onAbrir }: { pr: GitHubPR; repoId?: string; onAcao?: () => void; onAbrir?: () => void }) {
  const status = obterStatus(pr);
  const tempo = obterDataReferencia(pr);

  return (
    <div
      onClick={onAbrir}
      className={`px-4 py-3.5 flex flex-col gap-2 transition-[background] duration-150 ${onAbrir ? "cursor-pointer" : "cursor-default"}`}
      style={{ borderBottom: "1px solid var(--tf-border)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--tf-bg-secondary)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Linha principal: número + título + link */}
      <div className="flex items-start gap-2.5">
        <span
          className="flex items-center shrink-0 mt-0.5"
          style={{ color: status.cor }}
        >
          {status.icone}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="font-mono text-[13px] shrink-0"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              #{pr.number}
            </span>
            <span
              className="font-semibold text-sm leading-[1.4]"
              style={{ color: "var(--tf-text)" }}
            >
              {pr.title}
            </span>

            {pr.draft && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-px shrink-0"
                style={{
                  color: "var(--tf-text-tertiary)",
                  background: "var(--tf-border)",
                }}
              >
                <FileEdit size={10} />
                Draft
              </span>
            )}
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {pr.labels.map((label) => (
                <span
                  key={label.name}
                  className="text-[11px] font-medium rounded-full px-2 py-px"
                  style={{
                    background: `#${label.color}22`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}44`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <a
          href={pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 mt-0.5 flex items-center transition-[color] duration-150"
          style={{ color: "var(--tf-text-tertiary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--tf-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--tf-text-tertiary)")
          }
          title="Abrir no GitHub"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Linha de metadados */}
      <div className="flex items-center gap-3 pl-6 flex-wrap">
        {/* Autor */}
        <div className="flex items-center gap-[5px]">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            width={20}
            height={20}
            className="rounded-full shrink-0"
          />
          <span
            className="text-xs"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            {pr.user.login}
          </span>
        </div>

        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium"
          style={{ color: status.cor }}
        >
          {status.label}
        </span>

        {/* Tempo */}
        <span
          className="text-xs"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {tempo}
        </span>

        {/* Branches */}
        <div
          className="flex items-center gap-1 text-[11px]"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <GitBranch size={11} />
          <span
            className="font-mono rounded-[4px] px-1"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            {pr.head.ref}
          </span>
          <ArrowRight size={10} />
          <span
            className="font-mono rounded-[4px] px-1"
            style={{ background: "var(--tf-bg-secondary)" }}
          >
            {pr.base.ref}
          </span>
        </div>

        {/* Indicador visual para PRs abertas */}
        {pr.state === "open" && !pr.merged_at && (
          <span className="ml-auto text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
            Clique para abrir →
          </span>
        )}
      </div>

    </div>
  );
}

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "open", rotulo: "Abertas" },
  { valor: "closed", rotulo: "Fechadas" },
  { valor: "all", rotulo: "Todas" },
];

export function RepoPRs({ owner, nome, repoId, workspaceId, membros }: RepoPRsProps) {
  const [aba, setAba] = useState<Aba>("open");
  const { prs, carregando, revalidar } = usePRsAuth(owner, nome, aba);
  const [modalCriar, setModalCriar] = useState(false);
  const [prAberto, setPrAberto] = useState<number | null>(null);

  // Se um PR está aberto, mostrar o detalhe
  if (prAberto !== null) {
    return (
      <PRDetalhe
        owner={owner}
        nome={nome}
        prNumber={prAberto}
        repoId={repoId}
        onVoltar={() => { setPrAberto(null); revalidar(); }}
      />
    );
  }

  return (
    <>
      <div
        className="flex flex-col rounded-[8px] overflow-hidden"
        style={{
          border: "1px solid var(--tf-border)",
          background: "var(--tf-surface)",
        }}
      >
        {/* Cabeçalho com abas */}
        <div
          className="flex items-center gap-0.5 px-3 py-2"
          style={{
            borderBottom: "1px solid var(--tf-border)",
            background: "var(--tf-bg-secondary)",
          }}
        >
          <GitPullRequest
            size={16}
            className="mr-2"
            style={{ color: "var(--tf-text-secondary)" }}
          />
          <span
            className="text-[13px] font-semibold mr-3"
            style={{ color: "var(--tf-text)" }}
          >
            Pull Requests
          </span>

          <div
            className="flex gap-0.5 rounded-[8px] p-0.5"
            style={{ background: "var(--tf-bg)" }}
          >
            {ABAS.map((a) => (
              <button
                key={a.valor}
                onClick={() => setAba(a.valor)}
                className={`px-3 py-1 rounded-[4px] border-none cursor-pointer text-xs transition-all duration-150 ${aba === a.valor ? "font-semibold" : "font-normal"}`}
                style={{
                  color:
                    aba === a.valor
                      ? "var(--tf-text)"
                      : "var(--tf-text-tertiary)",
                  background:
                    aba === a.valor ? "var(--tf-surface)" : "transparent",
                }}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {!carregando && (
              <span
                className="text-xs"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {prs.length} {prs.length === 1 ? "PR" : "PRs"}
              </span>
            )}

            <button
              onClick={() => revalidar()}
              title="Recarregar PRs"
              className="flex items-center p-1 rounded-[4px] border-none cursor-pointer bg-transparent transition-[color] duration-150"
              style={{ color: "var(--tf-text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
            >
              <RefreshCw size={14} />
            </button>

            {repoId && (
              <button
                onClick={() => setModalCriar(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[8px] border-none cursor-pointer text-xs font-semibold text-white transition-[opacity] duration-150"
                style={{ background: "var(--tf-accent)" }}
              >
                <Plus size={13} /> Criar PR
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div>
          {carregando ? (
            <>
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
            </>
          ) : prs.length === 0 ? (
            <div
              className="px-4 py-10 flex flex-col items-center gap-2"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <Inbox size={32} className="opacity-40" />
              <span className="text-sm">
                Nenhuma pull request{" "}
                {aba === "open"
                  ? "aberta"
                  : aba === "closed"
                    ? "fechada"
                    : "encontrada"}
              </span>
              {repoId && (
                <button
                  onClick={() => setModalCriar(true)}
                  className="flex items-center gap-1 px-4 py-2 rounded-[8px] border-none cursor-pointer text-[13px] font-semibold text-white mt-2"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Plus size={14} /> Criar Pull Request
                </button>
              )}
            </div>
          ) : (
            prs.map((pr) => <PRItem key={pr.number} pr={pr} repoId={repoId} onAcao={revalidar} onAbrir={() => setPrAberto(pr.number)} />)
          )}
        </div>
      </div>

      {/* Modal Criar PR */}
      {repoId && (
        <CriarPR
          aberto={modalCriar}
          onFechar={() => {
            setModalCriar(false);
            revalidar();
          }}
          repoId={repoId}
          owner={owner}
          nome={nome}
          workspaceId={workspaceId}
          membros={membros}
        />
      )}
    </>
  );
}
