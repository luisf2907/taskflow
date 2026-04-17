# Módulo: Storage

O Taskflow precisa armazenar arquivos — imagens da wiki, anexos de
cartões, áudio de reuniões. Esse módulo é **plugável** via `STORAGE_DRIVER`.

## Drivers disponíveis

| Driver | Uso típico | Requisitos |
|---|---|---|
| `supabase` | Cloud default | Supabase Storage API |
| `local-disk` | Self-hosted solo/team | Volume docker (`/app/storage/`) |
| `s3-compat` | Self-hosted escala | MinIO, AWS S3, Cloudflare R2 (Fase 6) |

## Como funciona

```
Client code ───▶ storage-client.ts ───▶ /api/storage/* ───▶ driver
                 (browser/server)        (Next API routes)     │
                                                               ├─ supabase (SDK)
                                                               ├─ local-disk (fs)
                                                               └─ s3-compat (S3 API)
```

**Regra:** o código de UI nunca chama `supabase.storage.*` direto.
Tudo passa pelo `storage-client.ts` que bate em `/api/storage/*`, que
delega pro driver configurado. Trocar backend é 1 env var.

## Buckets

| Bucket | Privacidade | Tamanho | Tipos MIME |
|---|---|---|---|
| `wiki` | Público | 5 MB | image/jpeg, image/png, image/gif, image/webp |
| `anexos` | Público | 50 MB | any |
| `reunioes-audio` | Privado (signed URL) | 50 MB | audio/*, video/* |

## Driver: `supabase` (cloud default)

Wrap do SDK oficial. Zero mudança em comportamento cloud — uploads
continuam indo pro Supabase Storage API.

```env
STORAGE_DRIVER=supabase   # ou omitir (default)
```

Requer `SUPABASE_SERVICE_ROLE_KEY` pra ops admin (criar signed upload
URLs em bucket privado).

## Driver: `local-disk` (self-hosted default)

Armazena arquivos no filesystem do container app.

```env
STORAGE_DRIVER=local-disk
STORAGE_LOCAL_PATH=/app/storage    # default
```

### Estrutura de diretórios
```
/app/storage/
├── wiki/
│   └── <workspace_id>/<pagina_id>/<timestamp>_<filename>
├── anexos/
│   └── <cartao_id>/<timestamp>_<filename>
└── reunioes-audio/
    └── <workspace_id>/<reuniao_id>.webm
```

Cada arquivo tem um `.meta.json` irmão com `{ contentType }`.

### Volume Docker

O `docker-compose.solo.yml` já define:
```yaml
volumes:
  - storage-data:/app/storage
```

O volume `storage-data` persiste entre restarts. Pra backup, basta
copiar o conteúdo:

```bash
docker compose exec app tar -czf /tmp/storage-backup.tar.gz -C /app storage
docker compose cp app:/tmp/storage-backup.tar.gz ./storage-backup.tar.gz
```

### Signed URLs

Buckets privados (reunioes-audio) usam tokens HMAC-SHA256 assinados
com `JWT_SECRET`. Formato:
```
/api/storage/object/reunioes-audio/<path>?token=<base64url(payload)>.<base64url(sig)>
```
Payload: `{ b: bucket, p: path, e: expiresAt_unix, o: "r"|"w" }`.

Signed upload URLs (pra upload direto do browser):
```
/api/storage/upload?bucket=reunioes-audio&path=<path>&token=<hmac>
```
Cliente faz `PUT` com raw body — compatível com semântica S3.

### Path traversal

O driver valida que o path absoluto resolve dentro de `<bucket>/`.
Tentativas com `../` são rejeitadas em runtime.

## Driver: `s3-compat` (Fase 6 — não implementado)

Pra volumes grandes ou cenários de alta disponibilidade. Requer
endpoint S3-compatible:

```env
STORAGE_DRIVER=s3-compat
STORAGE_S3_ENDPOINT=http://minio:9000
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
STORAGE_S3_BUCKET_PREFIX=taskflow-
```

Compatível com MinIO, AWS S3, Cloudflare R2, Backblaze B2, etc.

## Migração de dados

### De cloud para local-disk

Quando migrar um instance do Supabase Cloud pra self-hosted,
arquivos existentes precisam ser copiados. Script pendente (TODO):

```bash
# Fase 6 TODO
npx taskflow migrate:storage --from supabase --to local-disk
```

Por enquanto, manualmente:
1. Baixar arquivos do Supabase Storage via `supabase storage download`
2. Copiar pra volume docker: `docker cp ./files app:/app/storage/`

### Entre perfis

Pra trocar `STORAGE_DRIVER` com dados existentes, faz dump e restore
dos arquivos entre drivers. URLs no banco (tabelas `anexos.url`,
`wiki_paginas.conteudo` com imagens inline) continuam funcionando se
você manter os paths. Se mudar a URL base, rode um `UPDATE` no DB.

## Permissões RLS

RLS no schema `storage.objects` filtra quem pode ler/escrever. Policies
vêm do dump em `supabase/self-hosted/bootstrap.sql`:
- `wiki_*` — 4 policies (public read, authenticated write/update/delete pros membros do workspace)
- `reunioes_audio_*` — 3 policies (só membros do workspace da reunião)
- `anexos` — **SEM policies** ⚠️ (débito técnico replicado do estado de produção; ver TODO.md)

O driver **não** valida permissões — isso é responsabilidade da RLS.
Em self-hosted com local-disk, o Next.js API route verifica sessão via
cookie e delega pro driver. Se o bucket tiver policies RLS, o PostgREST
valida quando houver query no banco (ex: listar anexos de um cartão).

## Troubleshooting

### 500 em `/api/storage/upload`
- Verificar se `STORAGE_LOCAL_PATH` existe e tem permissão de escrita
  pelo usuário do container (`nextjs`, uid 1001)
- Em solo: `docker compose exec app ls -la /app/storage`

### 403 em signed URL
- Token expirado → gerar novo via `createSignedUploadUrl`
- HMAC mismatch → `JWT_SECRET` mudou entre generation e verification

### Upload vai pro cloud mas deveria ir pro local-disk
- Verificar `STORAGE_DRIVER=local-disk` no container:
  ```bash
  docker compose exec app env | grep STORAGE_
  ```
- Rebuild necessário se mudou depois do build (envs públicas inlined)
