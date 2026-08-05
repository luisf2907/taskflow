#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════
# bootstrap.sh — Aplica o bootstrap.sql no Postgres
# ═══════════════════════════════════════════════════════════════════════
# Rodado pelo container one-shot "bootstrap" do docker-compose.
# Aguarda postgres + GoTrue estarem prontos (schema auth + tabela users
# criados), depois aplica o SQL.
#
# Schemas 'auth' e 'storage' ja sao pre-criados pelo postgres-init/01-init.sql.
# GoTrue na primeira subida roda suas migrations e cria auth.users,
# auth.identities, etc. Este script espera auth.users existir antes de
# aplicar o bootstrap.sql, que tem FKs pra ela.
#
# Idempotente: o bootstrap.sql usa IF NOT EXISTS / OR REPLACE / DROP
# POLICY IF EXISTS. Re-executar nao quebra dados.
# ═══════════════════════════════════════════════════════════════════════

set -eu

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-taskflow}"
MAX_WAIT="${MAX_WAIT:-60}"  # tentativas, 2s cada = 2 min default

log() {
  echo "[bootstrap] $1"
}

# ───── Migrations pos-bootstrap ─────
# O bootstrap.sql e um dump consolidado que PARA NA MIGRATION 046. As de
# 047 em diante nunca entraram nele, entao toda instalacao self-hosted
# subia sem: views salvas (047), busca global (048), subtarefas e
# dependencias (049), epicos (050), campos customizados (051), grafo de
# dependencias (052-054) e o RPC get_board_data do board (055).
#
# Nao da pra so re-rodar todas em todo boot: 047, 049 e 051 tem CREATE
# POLICY sem DROP POLICY antes, e o segundo boot morreria com "policy
# already exists". Por isso cada linha carrega um marcador — uma condicao
# SQL verdadeira quando aquela migration ja esta aplicada.
#
# Com o marcador, o mesmo codigo cobre os dois casos: instalacao nova
# (nada existe, aplica tudo em ordem) e instalacao antiga (aplica so o que
# falta, sem tocar no que ja esta la).
#
# Formato de cada linha:  arquivo|condicao_sql_verdadeira_se_ja_aplicada
aplicar_pendentes() {
    # ───── Pre-requisito: publicacao supabase_realtime ─────
    # As migrations 049 e 051 terminam com
    #     ALTER PUBLICATION supabase_realtime ADD TABLE ...;
    # A publicacao e criada automaticamente pelo Supabase cloud. No
    # self-hosted ela nao existe, o ALTER falha com
    #     ERROR: publication "supabase_realtime" does not exist
    # e como o psql roda com ON_ERROR_STOP=1, isso aborta o bootstrap
    # inteiro (exit 3) — derrubando tambem as migrations seguintes.
    #
    # O bootstrap.sql nao tem esse problema porque e um dump curado, sem
    # nenhuma linha de PUBLICATION. As migrations cruas tem.
    #
    # Criar a publicacao vazia resolve sem efeito colateral: sem subscriber
    # de replicacao logica consumindo, uma publicacao apenas marca tabelas e
    # nao gera trabalho. O realtime do self-hosted usa os gatilhos de
    # pg_notify do realtime-triggers.sql, nao esta publicacao.
    #
    # Fica aqui, e nao no postgres-init/, para valer tambem em volume que ja
    # existe — scripts de init so rodam em data directory vazio.
    psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
         -v ON_ERROR_STOP=1 > /dev/null <<'SQL_PUBLICACAO'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
SQL_PUBLICACAO
    log "  ✓ Publicacao supabase_realtime garantida."

    log "Verificando migrations pos-bootstrap (047+)..."
    while IFS='|' read -r mig teste; do
        if [ -z "$mig" ]; then continue; fi
        if [ ! -f "/migrations/$mig" ]; then
            log "  ! $mig ausente no volume /migrations — pulando."
            continue
        fi
        ja=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
             "SELECT CASE WHEN ($teste) THEN 1 ELSE 0 END;" 2>/dev/null || echo 0)
        if [ "$ja" = "1" ]; then
            log "  = $mig ja aplicada."
        else
            psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                 -v ON_ERROR_STOP=1 \
                 -f "/migrations/$mig" \
                 > /dev/null
            log "  ✓ $mig aplicada."
        fi
    done <<'MIGRATIONS_PENDENTES'
047_views_salvas.sql|to_regclass('public.views_salvas') IS NOT NULL
048_busca_global.sql|EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'buscar_global')
049_subtarefas_dependencias.sql|to_regclass('public.cartao_dependencias') IS NOT NULL
050_epicos.sql|EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cartoes' AND column_name = 'eh_epico')
051_campos_customizados.sql|to_regclass('public.campos_customizados') IS NOT NULL
052_grafo_dependencias.sql|EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'grafo_dependencias')
053_grafo_workspace.sql|EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'grafo_dependencias_workspace')
054_cards_sem_dep.sql|EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'cards_sem_dependencia_workspace')
055_board_rpc.sql|EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_board_data')
MIGRATIONS_PENDENTES
}

log "Aguardando Postgres em ${PGHOST}:${PGPORT}..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q; do
  sleep 1
done
log "Postgres pronto."

# ───── Espera GoTrue criar auth.users ─────
# FKs do bootstrap.sql (ex: github_tokens.user_id → auth.users.id) exigem
# que a tabela ja exista. GoTrue cria isso nas migrations da primeira
# subida. Esperamos ate ~2 min.
log "Aguardando GoTrue migrar (tabela auth.users)..."
for i in $(seq 1 "$MAX_WAIT"); do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
     "SELECT 1 FROM information_schema.tables WHERE table_schema='auth' AND table_name='users';" \
     2>/dev/null | grep -q 1; then
    log "✓ auth.users existe."
    break
  fi
  if [ "$i" -eq "$MAX_WAIT" ]; then
    log "ERRO: GoTrue nao criou auth.users em $((MAX_WAIT * 2))s."
    log "Cheque logs do gotrue: docker compose logs gotrue"
    exit 2
  fi
  if [ "$((i % 10))" -eq 0 ]; then
    log "... ainda esperando GoTrue (tentativa $i/$MAX_WAIT)"
  fi
  sleep 2
done

# ───── Skip se schema ja aplicado ─────
# bootstrap.sql tem CREATE INDEX e ADD CONSTRAINT sem IF NOT EXISTS (60
# indexes + 97 constraints vindos do dump). Em vez de tornar cada
# statement idempotente, checamos um marcador bem conhecido — se a
# tabela public.workspaces existir, o bootstrap ja rodou com sucesso
# antes.
log "Checando se schema ja foi aplicado..."
ALREADY=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspaces';" \
    2>/dev/null || echo "")

if [ "$ALREADY" = "1" ]; then
    log "✓ Schema base ja aplicado anteriormente."

    # Ainda assim, re-aplica objetos que sao idempotentes e podem ter
    # sido adicionados em versoes posteriores (triggers realtime, policies
    # adicionadas em migrations pos-bootstrap, RPCs, etc). Seguro — tudo
    # aqui usa CREATE OR REPLACE / DROP IF EXISTS.
    log "Re-aplicando objetos idempotentes (triggers realtime, migrations)..."
    if [ -f /realtime-triggers.sql ]; then
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
             -v ON_ERROR_STOP=1 \
             -f /realtime-triggers.sql \
             > /dev/null
        log "  ✓ Triggers realtime atualizados."
    fi

    # Lista explicita de migrations seguras pra re-aplicar em upgrade.
    # Criterio: arquivo usa DROP IF EXISTS / CREATE OR REPLACE em tudo.
    # Adicione aqui quando uma migration nova couber nesse padrao.
    UPGRADE_MIGRATIONS="045_anexos_storage_policies.sql 046_perfis_must_change_password.sql"
    for mig in $UPGRADE_MIGRATIONS; do
        if [ -f "/migrations/$mig" ]; then
            psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                 -v ON_ERROR_STOP=1 \
                 -f "/migrations/$mig" \
                 > /dev/null
            log "  ✓ Migration $mig aplicada."
        fi
    done

    # As 047+ nao estao no bootstrap.sql. Numa instalacao que subiu antes
    # desta correcao, elas nunca foram aplicadas — o marcador de cada uma
    # detecta isso e recupera o atraso sem tocar no que ja existe.
    aplicar_pendentes

    log "  Pra re-aplicar schema completo: docker compose down -v (DESTROY)"
    exit 0
fi

log "Aplicando bootstrap.sql..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
     -v ON_ERROR_STOP=1 \
     -f /bootstrap.sql

# O bootstrap.sql para na 046. Sem isto a instalacao nova nascia sem views
# salvas, busca global, subtarefas, epicos, campos customizados, grafo e o
# RPC do board.
aplicar_pendentes

log "✓ Schema aplicado com sucesso."
log "Proximo passo: criar usuario admin com"
log "  docker compose exec app npx taskflow bootstrap"
log "(CLI disponivel na Fase 2 do plano; por hora, criacao de user e manual)"
