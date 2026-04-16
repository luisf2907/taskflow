# ═══════════════════════════════════════════════════════════════════════
# Taskflow — Makefile de atalhos pro self-hosted
# ═══════════════════════════════════════════════════════════════════════
# Uso rapido:
#   make setup         # primeira vez: gera .env.local com secrets
#   make up            # sobe stack solo
#   make down          # derruba stack (mantem dados)
#   make logs          # segue logs de todos os servicos
#   make clean         # derruba E apaga volumes (DESTROY, sem volta)
#   make admin EMAIL=x PASSWORD=y  # cria usuario via CLI
#
# Profiles (solo/team/full): default e solo; override com PROFILE=team
# ═══════════════════════════════════════════════════════════════════════

PROFILE ?= solo
COMPOSE_FILE := docker/docker-compose.$(PROFILE).yml
ENV_FILE := .env.local

COMPOSE := docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)

.PHONY: help
help:
	@echo "Taskflow self-hosted — comandos disponiveis:"
	@echo ""
	@echo "  make setup                  Gera .env.local com secrets (primeira vez)"
	@echo "  make up                     Sobe o stack ($(PROFILE))"
	@echo "  make down                   Derruba o stack (mantem dados)"
	@echo "  make logs                   Segue logs"
	@echo "  make logs SERVICE=app       Segue logs de um servico"
	@echo "  make ps                     Status dos containers"
	@echo "  make restart SERVICE=app    Reinicia um servico"
	@echo "  make rebuild                Rebuild da imagem do app"
	@echo "  make clean                  DESTROY: derruba + apaga volumes"
	@echo ""
	@echo "  make bootstrap EMAIL=X PASSWORD=Y [NAME=Z] [WORKSPACE=W]"
	@echo "                              Primeiro setup (admin + workspace)"
	@echo "  make user-create EMAIL=X PASSWORD=Y [NAME=Z]"
	@echo "                              Cria um user"
	@echo "  make user-list              Lista users"
	@echo "  make user-reset-password EMAIL=X PASSWORD=Y"
	@echo "                              Reseta senha"
	@echo "  make user-delete EMAIL=X    Remove user"
	@echo ""
	@echo "  make health                 Valida stack (todos servicos + schema)"
	@echo "  make workspace-create NAME=X OWNER=email"
	@echo "  make workspace-list"
	@echo "  make workspace-invite WORKSPACE=X EMAIL=Y [PAPEL=admin]"
	@echo ""
	@echo "  make shell SERVICE=app      Entra no container"
	@echo ""
	@echo "Variaveis:"
	@echo "  PROFILE      solo | team | full  (atual: $(PROFILE))"
	@echo "  SERVICE      nome do servico do compose"

.PHONY: setup
setup:
	node scripts/setup-env.mjs $(PROFILE)

.PHONY: up
up:
	@test -f $(ENV_FILE) || (echo "ERRO: $(ENV_FILE) nao existe. Rode 'make setup' primeiro."; exit 1)
	$(COMPOSE) up -d
	@echo ""
	@echo "✓ Stack subindo. Acompanhe com 'make logs'."
	@echo "  App em: http://localhost:3000"

.PHONY: down
down:
	$(COMPOSE) down

.PHONY: logs
logs:
	$(COMPOSE) logs -f $(SERVICE)

.PHONY: ps
ps:
	$(COMPOSE) ps

.PHONY: restart
restart:
	$(COMPOSE) restart $(SERVICE)

.PHONY: rebuild
rebuild:
	$(COMPOSE) build app
	$(COMPOSE) up -d app

.PHONY: clean
clean:
	@echo "ATENCAO: isto vai APAGAR todos os dados (postgres + storage)."
	@read -p "Confirma? (escreva 'sim' pra prosseguir): " confirm && [ "$$confirm" = "sim" ]
	$(COMPOSE) down -v

.PHONY: bootstrap
bootstrap:
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	@test -n "$(PASSWORD)" || (echo "Falta PASSWORD=..."; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs bootstrap \
		--admin-email "$(EMAIL)" \
		--admin-password "$(PASSWORD)" \
		--admin-name "$(or $(NAME),Admin)" \
		--workspace-name "$(or $(WORKSPACE),Default)"

.PHONY: user-create
user-create:
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	@test -n "$(PASSWORD)" || (echo "Falta PASSWORD=..."; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs user:create \
		--email "$(EMAIL)" \
		--password "$(PASSWORD)" \
		--name "$(or $(NAME),$(EMAIL))"

.PHONY: user-list
user-list:
	node --env-file=$(ENV_FILE) scripts/cli.mjs user:list

.PHONY: user-reset-password
user-reset-password:
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	@test -n "$(PASSWORD)" || (echo "Falta PASSWORD=..."; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs user:reset-password \
		--email "$(EMAIL)" \
		--password "$(PASSWORD)"

.PHONY: user-delete
user-delete:
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs user:delete \
		--email "$(EMAIL)" \
		--yes

.PHONY: health
health:
	node --env-file=$(ENV_FILE) scripts/cli.mjs health

.PHONY: workspace-create
workspace-create:
	@test -n "$(NAME)" || (echo "Falta NAME=..."; exit 1)
	@test -n "$(OWNER)" || (echo "Falta OWNER=... (email)"; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs workspace:create \
		--name "$(NAME)" \
		--owner "$(OWNER)"

.PHONY: workspace-list
workspace-list:
	node --env-file=$(ENV_FILE) scripts/cli.mjs workspace:list

.PHONY: workspace-invite
workspace-invite:
	@test -n "$(WORKSPACE)" || (echo "Falta WORKSPACE=... (nome)"; exit 1)
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	node --env-file=$(ENV_FILE) scripts/cli.mjs workspace:invite \
		--workspace "$(WORKSPACE)" \
		--email "$(EMAIL)" \
		$(if $(PAPEL),--papel $(PAPEL),)

.PHONY: cli
cli:
	node --env-file=$(ENV_FILE) scripts/cli.mjs $(filter-out $@,$(MAKECMDGOALS))

.PHONY: shell
shell:
	$(COMPOSE) exec $(SERVICE) /bin/sh

.PHONY: backup
backup:
	$(COMPOSE) exec postgres pg_dump -U postgres -d taskflow > backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✓ Backup gerado (schema + dados)."
