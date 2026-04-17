# Módulo: VCS (GitHub/Gitea)

Integração com sistemas de controle de versão — listar repos, PRs,
commits, branches, criar PR, merge etc. Plugável via `VCS_DRIVER` +
`VCS_API_URL` + `VCS_TOKEN_MODE`.

## Drivers

| Driver | Endpoint | Obs |
|---|---|---|
| `github` | `api.github.com` ou custom | default |
| `gitea` | `VCS_API_URL` obrigatório | API quase 100% compat com GitHub v3 |
| `disabled` | — | UI esconde aba Repos e seção GitHub |

## Token modes

| Mode | Como | Uso típico |
|---|---|---|
| `oauth` | User conecta via botão "Entrar com GitHub" | cloud, SaaS |
| `pat` | User cola PAT em Settings → GitHub | self-hosted multi-user |
| `instance-pat` | Admin define 1 PAT global via env | home lab com GitHub org |

## Setup

### GitHub cloud padrão

```env
VCS_DRIVER=github
VCS_TOKEN_MODE=oauth
# VCS_API_URL não necessário
```

### GitHub Enterprise

```env
VCS_DRIVER=github
VCS_API_URL=https://github.empresa.com/api/v3
VCS_TOKEN_MODE=pat           # OAuth depende de OAuth App no GHES
```

### Gitea self-hosted

```env
VCS_DRIVER=gitea
VCS_API_URL=https://gitea.empresa.com/api/v1
VCS_TOKEN_MODE=pat
```

### Instance-PAT (home lab, 1 token global)

```env
VCS_DRIVER=github
VCS_TOKEN_MODE=instance-pat
VCS_INSTANCE_PAT=ghp_xxxxx   # PAT com scope repo
NEXT_PUBLIC_VCS_TOKEN_MODE=instance-pat
```

Efeito:
- Todos os users do instance usam o **mesmo token**
- Settings → GitHub mostra "Token gerenciado pelo admin" (read-only)
- Não há fluxo individual de conectar GitHub
- Útil quando todo mundo do time usa a mesma GitHub org

## Compatibilidade

**GitHub API v3** (endpoints usados):
- `GET /repos/:owner/:repo` ✅
- `GET /repos/:owner/:repo/branches` ✅
- `GET /repos/:owner/:repo/pulls` ✅
- `GET /repos/:owner/:repo/pulls/:n` ✅
- `POST /repos/:owner/:repo/pulls` (create PR) ✅
- `PUT /repos/:owner/:repo/pulls/:n/merge` ✅
- `PATCH /repos/:owner/:repo/pulls/:n` (close) ✅
- `POST /repos/:owner/:repo/issues/:n/comments` ✅
- `POST /repos/:owner/:repo/pulls/:n/requested_reviewers` ✅

**Gitea 1.20+** — compat com endpoints acima. Exceções conhecidas:
- Reviewers: Gitea usa API ligeiramente diferente. Pode falhar em
  casos específicos.
- Search avançado: Gitea tem limitações em query strings complexas.

## Token scope

Mínimo recomendado:
- `repo` — acesso a repos privados + PRs
- `read:org` — listar repos da org

PAT clássico do GitHub:
```
https://github.com/settings/tokens/new?scopes=repo,read:org&description=Taskflow
```

Gitea: gera em `https://gitea.xxx/user/settings/applications`.

## Troubleshooting

### `403 Forbidden` em repos privados
- Token sem scope `repo`. Regenera com escopo completo.

### `instance-pat` configurado mas user vê "Conecte GitHub"
- Verificar build-arg: precisa rebuildar o app:
  ```bash
  docker compose build app --no-cache
  ```
- Conferir `NEXT_PUBLIC_VCS_TOKEN_MODE=instance-pat` no `.env.local`

### Gitea retorna 404 em endpoints
- `VCS_API_URL` errado. Gitea usa `/api/v1` não `/api/v3`.
- Versão antiga do Gitea (<1.17) não tem endpoints de PR reviewers.

### URL parse não reconhece Gitea em `parsearRepo()`
- `src/lib/github/client.ts` tem regex `github\.com/...` hardcoded no helper `parsearRepo`. Se user colar URL tipo `https://gitea.xxx/owner/repo`, não parseia. **TODO**: tornar regex genérica usando hostname de `VCS_API_URL`.
