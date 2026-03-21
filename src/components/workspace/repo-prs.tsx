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
import useSWR from "swr";
import type { GitHubPR } from "@/types/github";

interface RepoPRsProps {
  owner: string;
  nome: string;
  repoId?: string;
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
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--tf-border)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "50px",
            height: "14px",
            borderRadius: "4px",
            background: "var(--tf-border)",
            opacity: 0.5,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "60%",
            height: "16px",
            borderRadius: "4px",
            background: "var(--tf-border)",
            opacity: 0.5,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "var(--tf-border)",
            opacity: 0.5,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "80px",
            height: "12px",
            borderRadius: "4px",
            background: "var(--tf-border)",
            opacity: 0.5,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

function PRItem({ pr }: { pr: GitHubPR }) {
  const status = obterStatus(pr);
  const tempo = obterDataReferencia(pr);

  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--tf-border)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--tf-bg-secondary)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Linha principal: número + título + link */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <span
          style={{
            color: status.cor,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {status.icone}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                color: "var(--tf-text-tertiary)",
                flexShrink: 0,
              }}
            >
              #{pr.number}
            </span>
            <span
              style={{
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--tf-text)",
                lineHeight: 1.4,
              }}
            >
              {pr.title}
            </span>

            {pr.draft && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--tf-text-tertiary)",
                  background: "var(--tf-border)",
                  borderRadius: "10px",
                  padding: "1px 8px",
                  flexShrink: 0,
                }}
              >
                <FileEdit size={10} />
                Draft
              </span>
            )}
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                marginTop: "6px",
              }}
            >
              {pr.labels.map((label) => (
                <span
                  key={label.name}
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    borderRadius: "10px",
                    padding: "1px 8px",
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
          style={{
            color: "var(--tf-text-tertiary)",
            flexShrink: 0,
            marginTop: "2px",
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s",
          }}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingLeft: "24px",
          flexWrap: "wrap",
        }}
      >
        {/* Autor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            width={20}
            height={20}
            style={{
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: "var(--tf-text-secondary)",
            }}
          >
            {pr.user.login}
          </span>
        </div>

        {/* Status badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 500,
            color: status.cor,
          }}
        >
          {status.label}
        </span>

        {/* Tempo */}
        <span
          style={{
            fontSize: "12px",
            color: "var(--tf-text-tertiary)",
          }}
        >
          {tempo}
        </span>

        {/* Branches */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            color: "var(--tf-text-tertiary)",
          }}
        >
          <GitBranch size={11} />
          <span
            style={{
              fontFamily: "monospace",
              background: "var(--tf-bg-secondary)",
              borderRadius: "4px",
              padding: "0 4px",
            }}
          >
            {pr.head.ref}
          </span>
          <ArrowRight size={10} />
          <span
            style={{
              fontFamily: "monospace",
              background: "var(--tf-bg-secondary)",
              borderRadius: "4px",
              padding: "0 4px",
            }}
          >
            {pr.base.ref}
          </span>
        </div>
      </div>
    </div>
  );
}

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "open", rotulo: "Abertas" },
  { valor: "closed", rotulo: "Fechadas" },
  { valor: "all", rotulo: "Todas" },
];

export function RepoPRs({ owner, nome, repoId }: RepoPRsProps) {
  const [aba, setAba] = useState<Aba>("open");
  const { prs, carregando, revalidar } = usePRsAuth(owner, nome, aba);
  const [modalCriar, setModalCriar] = useState(false);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--tf-border)",
          borderRadius: "8px",
          overflow: "hidden",
          background: "var(--tf-surface)",
        }}
      >
        {/* Cabeçalho com abas */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            padding: "8px 12px",
            borderBottom: "1px solid var(--tf-border)",
            background: "var(--tf-bg-secondary)",
          }}
        >
          <GitPullRequest
            size={16}
            style={{
              color: "var(--tf-text-secondary)",
              marginRight: "8px",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--tf-text)",
              marginRight: "12px",
            }}
          >
            Pull Requests
          </span>

          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "var(--tf-bg)",
              borderRadius: "6px",
              padding: "2px",
            }}
          >
            {ABAS.map((a) => (
              <button
                key={a.valor}
                onClick={() => setAba(a.valor)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: aba === a.valor ? 600 : 400,
                  color:
                    aba === a.valor
                      ? "var(--tf-text)"
                      : "var(--tf-text-tertiary)",
                  background:
                    aba === a.valor ? "var(--tf-surface)" : "transparent",
                  boxShadow:
                    aba === a.valor ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            {!carregando && (
              <span style={{ fontSize: "12px", color: "var(--tf-text-tertiary)" }}>
                {prs.length} {prs.length === 1 ? "PR" : "PRs"}
              </span>
            )}

            <button
              onClick={() => revalidar()}
              title="Recarregar PRs"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                color: "var(--tf-text-tertiary)",
                background: "transparent",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
            >
              <RefreshCw size={14} />
            </button>

            {repoId && (
              <button
                onClick={() => setModalCriar(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#fff",
                  background: "var(--tf-accent)",
                  transition: "opacity 0.15s",
                }}
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
              style={{
                padding: "40px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                color: "var(--tf-text-tertiary)",
              }}
            >
              <Inbox size={32} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: "14px" }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#fff",
                    background: "var(--tf-accent)",
                    marginTop: "8px",
                  }}
                >
                  <Plus size={14} /> Criar Pull Request
                </button>
              )}
            </div>
          ) : (
            prs.map((pr) => <PRItem key={pr.number} pr={pr} />)
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
        />
      )}
    </>
  );
}
