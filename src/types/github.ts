// Tipos para a API do GitHub

export interface Repositorio {
  id: string;
  workspace_id: string;
  owner: string;
  nome: string;
  webhook_secret: string | null;
  coluna_review_id: string | null;
  coluna_done_id: string | null;
  coluna_doing_id: string | null;
  criado_em: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  license: { name: string; spdx_id: string } | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
}

export interface GitHubConteudo {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
  html_url: string;
  download_url: string | null;
  content?: string; // base64 encoded (só pra arquivos)
  encoding?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  labels: { name: string; color: string }[];
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  body: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  requested_reviewers?: { login: string; avatar_url: string }[];
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}
