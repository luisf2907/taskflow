"use client";

import {
  buscarBranches,
  buscarConteudo,
  buscarPRs,
  buscarRepo,
  buscarArquivoRaw,
  buscarCommits,
} from "@/lib/github/client";
import type {
  GitHubBranch,
  GitHubCommit,
  GitHubConteudo,
  GitHubPR,
  GitHubRepo,
} from "@/types/github";
import useSWR from "swr";

// Metadata do repo
export function useGitHubRepo(owner: string, nome: string) {
  const { data, isLoading, error } = useSWR<GitHubRepo | null>(
    owner && nome ? `github-repo-${owner}/${nome}` : null,
    () => buscarRepo(owner, nome),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  return { repo: data || null, carregando: isLoading, erro: error };
}

// Conteúdo de diretório/arquivo
export function useGitHubConteudo(owner: string, nome: string, path: string, branch?: string) {
  const { data, isLoading, error } = useSWR<GitHubConteudo[] | GitHubConteudo | null>(
    owner && nome ? `github-conteudo-${owner}/${nome}/${path}@${branch || "default"}` : null,
    () => buscarConteudo(owner, nome, path, branch),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { conteudo: data, carregando: isLoading, erro: error };
}

// Conteúdo raw de arquivo
export function useGitHubArquivo(owner: string, nome: string, path: string, branch?: string) {
  const { data, isLoading } = useSWR<string | null>(
    owner && nome && path ? `github-raw-${owner}/${nome}/${path}@${branch || "default"}` : null,
    () => buscarArquivoRaw(owner, nome, path, branch),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { conteudo: data, carregando: isLoading };
}

// Branches
export function useGitHubBranches(owner: string, nome: string) {
  const { data, isLoading } = useSWR<GitHubBranch[]>(
    owner && nome ? `github-branches-${owner}/${nome}` : null,
    () => buscarBranches(owner, nome),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  return { branches: data || [], carregando: isLoading };
}

// Pull Requests
export function useGitHubPRs(owner: string, nome: string, state: "open" | "closed" | "all" = "all") {
  const { data, isLoading } = useSWR<GitHubPR[]>(
    owner && nome ? `github-prs-${owner}/${nome}/${state}` : null,
    () => buscarPRs(owner, nome, state),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { prs: data || [], carregando: isLoading };
}

// Commits
export function useGitHubCommits(owner: string, nome: string, branch?: string) {
  const { data, isLoading } = useSWR<GitHubCommit[]>(
    owner && nome ? `github-commits-${owner}/${nome}/${branch || "default"}` : null,
    () => buscarCommits(owner, nome, branch),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { commits: data || [], carregando: isLoading };
}
