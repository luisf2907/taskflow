"use client";

import type {
  GitHubBranch,
  GitHubCommit,
  GitHubConteudo,
  GitHubPR,
  GitHubRepo,
} from "@/types/github";
import useSWR from "swr";

// Proxy autenticado — passa pelo /api/github/[...path] que injeta o token
async function githubProxy<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/github${path}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function githubProxyRaw(path: string): Promise<string | null> {
  try {
    const separator = path.includes("?") ? "&" : "?";
    const res = await fetch(`/api/github${path}${separator}_raw=1`);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// Metadata do repo
export function useGitHubRepo(owner: string, nome: string) {
  const { data, isLoading, error } = useSWR<GitHubRepo | null>(
    owner && nome ? `github-repo-${owner}/${nome}` : null,
    () => githubProxy<GitHubRepo>(`/repos/${owner}/${nome}`),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  return { repo: data || null, carregando: isLoading, erro: error };
}

// Conteúdo de diretório/arquivo
export function useGitHubConteudo(owner: string, nome: string, path: string, branch?: string) {
  const refParam = branch ? `?ref=${branch}` : "";
  const { data, isLoading, error } = useSWR<GitHubConteudo[] | GitHubConteudo | null>(
    owner && nome ? `github-conteudo-${owner}/${nome}/${path}@${branch || "default"}` : null,
    () => githubProxy<GitHubConteudo[] | GitHubConteudo>(`/repos/${owner}/${nome}/contents/${path}${refParam}`),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { conteudo: data, carregando: isLoading, erro: error };
}

// Conteúdo raw de arquivo
export function useGitHubArquivo(owner: string, nome: string, path: string, branch?: string) {
  const refParam = branch ? `?ref=${branch}` : "";
  const { data, isLoading } = useSWR<string | null>(
    owner && nome && path ? `github-raw-${owner}/${nome}/${path}@${branch || "default"}` : null,
    () => githubProxyRaw(`/repos/${owner}/${nome}/contents/${path}${refParam}`),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { conteudo: data, carregando: isLoading };
}

// Branches
export function useGitHubBranches(owner: string, nome: string) {
  const { data, isLoading } = useSWR(
    owner && nome ? `github-branches-${owner}/${nome}` : null,
    async () => (await githubProxy<GitHubBranch[]>(`/repos/${owner}/${nome}/branches?per_page=100`)) || [],
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  return { branches: data || [], carregando: isLoading };
}

// Pull Requests
export function useGitHubPRs(owner: string, nome: string, state: "open" | "closed" | "all" = "all") {
  const { data, isLoading } = useSWR(
    owner && nome ? `github-prs-${owner}/${nome}/${state}` : null,
    async () => (await githubProxy<GitHubPR[]>(`/repos/${owner}/${nome}/pulls?state=${state}&per_page=30&sort=updated&direction=desc`)) || [],
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { prs: data || [], carregando: isLoading };
}

// Commits
export function useGitHubCommits(owner: string, nome: string, branch?: string) {
  const branchParam = branch ? `?sha=${branch}&per_page=20` : "?per_page=20";
  const { data, isLoading } = useSWR(
    owner && nome ? `github-commits-${owner}/${nome}/${branch || "default"}` : null,
    async () => (await githubProxy<GitHubCommit[]>(`/repos/${owner}/${nome}/commits${branchParam}`)) || [],
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  return { commits: data || [], carregando: isLoading };
}
