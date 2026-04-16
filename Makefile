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
	@echo "  make admin EMAIL=X PASSWORD=Y NAME=Z"
	@echo "                              Cria usuario admin"
	@echo "  make health                 Valida stack end-to-end"
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

.PHONY: admin
admin:
	@test -n "$(EMAIL)" || (echo "Falta EMAIL=..."; exit 1)
	@test -n "$(PASSWORD)" || (echo "Falta PASSWORD=..."; exit 1)
	$(COMPOSE) exec app npx taskflow user:create \
		--email "$(EMAIL)" \
		--password "$(PASSWORD)" \
		--name "$(NAME)"

.PHONY: health
health:
	$(COMPOSE) exec app npx taskflow health

.PHONY: shell
shell:
	$(COMPOSE) exec $(SERVICE) /bin/sh

.PHONY: backup
backup:
	$(COMPOSE) exec postgres pg_dump -U postgres -d taskflow > backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✓ Backup gerado (schema + dados)."
