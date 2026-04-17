# Deploy em VPS com HTTPS

Guia pra rodar Taskflow num VPS (DigitalOcean, Hetzner, AWS EC2, etc)
com domínio próprio e HTTPS automático via Let's Encrypt.

## Pré-requisitos

- VPS com Ubuntu 22+ (ou similar), 2+ vCPU, 2+ GB RAM
- Docker e docker compose instalados
- Domínio apontando pro IP do VPS (DNS A record)
- Portas 80 e 443 abertas no firewall

## Opção A — Caddy (recomendado)

Caddy é um reverse proxy com HTTPS automático (zero config de certificado).

### 1. Instale o Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 2. Configure o Caddyfile

```bash
sudo tee /etc/caddy/Caddyfile << 'EOF'
taskflow.seudominio.com {
    # App Next.js
    reverse_proxy localhost:3000
}

api.taskflow.seudominio.com {
    # Gateway Supabase (GoTrue + PostgREST)
    reverse_proxy localhost:8000
}
EOF
```

### 3. Ajuste envs

No `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://api.taskflow.seudominio.com
NEXT_PUBLIC_SITE_URL=https://taskflow.seudominio.com
```

### 4. Suba tudo

```bash
# Rebuild com as novas URLs (são build args)
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local build app
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d

# Restart Caddy
sudo systemctl restart caddy
```

### 5. Verifique

```bash
curl https://taskflow.seudominio.com/api/health
# Deve retornar {"status":"ok",...}
```

---

## Opção B — Traefik

Traefik é um reverse proxy que roda como container Docker.

### 1. Crie a rede Docker

```bash
docker network create web
```

### 2. Crie `docker-compose.traefik.yml`

```yaml
name: traefik

services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=seu-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-acme:/acme
    networks:
      - web

networks:
  web:
    external: true

volumes:
  traefik-acme:
```

### 3. Adicione labels no compose do Taskflow

No seu `docker-compose.<profile>.yml`, adicione ao service `app`:

```yaml
app:
  # ... (config existente)
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.taskflow.rule=Host(`taskflow.seudominio.com`)"
    - "traefik.http.routers.taskflow.tls.certresolver=letsencrypt"
    - "traefik.http.services.taskflow.loadbalancer.server.port=3000"
  networks:
    - default
    - web
```

E ao service `nginx`:

```yaml
nginx:
  # ... (config existente)
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.taskflow-api.rule=Host(`api.taskflow.seudominio.com`)"
    - "traefik.http.routers.taskflow-api.tls.certresolver=letsencrypt"
    - "traefik.http.services.taskflow-api.loadbalancer.server.port=8000"
  networks:
    - default
    - web
```

### 4. Suba

```bash
# Traefik primeiro
docker compose -f docker-compose.traefik.yml up -d

# Depois o Taskflow
docker compose -f docker/docker-compose.<profile>.yml --env-file .env.local up -d
```

---

## Segurança adicional

### Firewall

```bash
# Só permite 80, 443, e SSH
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Importante:** portas 3000, 8000, 8800, 9001 **NÃO** devem ficar
expostas publicamente — Caddy/Traefik fazem proxy pra elas internamente.

### Headers de segurança

Caddy adiciona HSTS automaticamente. Pra Traefik, adicione middleware:

```yaml
- "traefik.http.middlewares.security.headers.stsSeconds=31536000"
- "traefik.http.middlewares.security.headers.stsIncludeSubdomains=true"
```

### Rate limiting no proxy reverso

O app já tem rate limiting interno (Redis/in-memory). Pra proteção
extra contra DDoS no nível do proxy:

**Caddy:**
```
taskflow.seudominio.com {
    rate_limit {remote.ip} 100r/m
    reverse_proxy localhost:3000
}
```

**Traefik:** use middleware `rateLimit`.

## Monitoramento

- **Health check:** `curl https://taskflow.seudominio.com/api/health`
- **CLI health:** `node --env-file=.env.local scripts/cli.mjs health`
- **Logs:** `docker compose logs -f app`
- **GlitchTip (full profile):** dashboard em `https://errors.seudominio.com`
