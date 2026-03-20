import type {
  GitHubBranch,
  GitHubCommit,
  GitHubConteudo,
  GitHubPR,
  GitHubRepo,
} from "@/types/github";

const BASE = "https://api.github.com";

async function githubFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Metadata do repositório
export async function buscarRepo(owner: string, nome: string): Promise<GitHubRepo | null> {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${nome}`);
}

// Conteúdo de um diretório ou arquivo
export async function buscarConteudo(
  owner: string,
  nome: string,
  path: string = "",
  ref?: string
): Promise<GitHubConteudo[] | GitHubConteudo | null> {
  const refParam = ref ? `?ref=${ref}` : "";
  return githubFetch<GitHubConteudo[] | GitHubConteudo>(
    `/repos/${owner}/${nome}/contents/${path}${refParam}`
  );
}

// Conteúdo raw de um arquivo (texto puro)
export async function buscarArquivoRaw(
  owner: string,
  nome: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const refParam = ref ? `?ref=${ref}` : "";
    const res = await fetch(`${BASE}/repos/${owner}/${nome}/contents/${path}${refParam}`, {
      headers: {
        Accept: "application/vnd.github.v3.raw",
      },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// Lista de branches
export async function buscarBranches(
  owner: string,
  nome: string
): Promise<GitHubBranch[]> {
  const data = await githubFetch<GitHubBranch[]>(
    `/repos/${owner}/${nome}/branches?per_page=100`
  );
  return data || [];
}

// Lista de PRs
export async function buscarPRs(
  owner: string,
  nome: string,
  state: "open" | "closed" | "all" = "all"
): Promise<GitHubPR[]> {
  const data = await githubFetch<GitHubPR[]>(
    `/repos/${owner}/${nome}/pulls?state=${state}&per_page=30&sort=updated&direction=desc`
  );
  return data || [];
}

// Commits recentes de uma branch
export async function buscarCommits(
  owner: string,
  nome: string,
  branch?: string
): Promise<GitHubCommit[]> {
  const branchParam = branch ? `?sha=${branch}&per_page=20` : "?per_page=20";
  const data = await githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${nome}/commits${branchParam}`
  );
  return data || [];
}

// Linguagens do repo
export async function buscarLinguagens(
  owner: string,
  nome: string
): Promise<Record<string, number>> {
  const data = await githubFetch<Record<string, number>>(
    `/repos/${owner}/${nome}/languages`
  );
  return data || {};
}

// Parsear URL ou "owner/repo" pra extrair owner e nome
export function parsearRepo(input: string): { owner: string; nome: string } | null {
  // Tentar URL: https://github.com/owner/repo
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], nome: urlMatch[2].replace(/\.git$/, "") };
  }

  // Tentar owner/repo
  const slashMatch = input.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], nome: slashMatch[2].replace(/\.git$/, "") };
  }

  return null;
}

// Extensão → linguagem (para syntax highlight básico)
export function extensaoParaLinguagem(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mapa: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript", mjs: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    css: "css", scss: "css", less: "css",
    html: "html", htm: "html",
    json: "json",
    yaml: "yaml", yml: "yaml",
    toml: "toml",
    md: "markdown",
    sql: "sql",
    sh: "shell", bash: "shell", zsh: "shell",
    dockerfile: "docker",
    xml: "xml", svg: "xml",
    c: "c", h: "c",
    cpp: "cpp", hpp: "cpp", cc: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    dart: "dart",
    r: "r",
    lua: "lua",
    zig: "zig",
    ex: "elixir", exs: "elixir",
    vue: "vue",
    svelte: "svelte",
  };
  return mapa[ext] || "text";
}

// Verificar se é arquivo binário pela extensão
export function ehBinario(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const binarios = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp",
    "pdf", "zip", "tar", "gz", "rar", "7z",
    "mp3", "mp4", "wav", "avi", "mov", "mkv",
    "woff", "woff2", "ttf", "eot", "otf",
    "exe", "dll", "so", "dylib",
    "pyc", "class", "o", "obj",
    "db", "sqlite",
  ]);
  return binarios.has(ext);
}
