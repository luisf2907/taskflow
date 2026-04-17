-- ═══════════════════════════════════════════════════════════════════════
-- Realtime triggers — pg_notify pra SSE driver
-- ═══════════════════════════════════════════════════════════════════════
-- Emite eventos no canal `realtime_events` quando tabelas monitoradas
-- mudam. O SSE endpoint /api/realtime/* do Next.js mantem conexao
-- LISTEN realtime_events e repassa pro browser filtrado por escopo.
--
-- Canal unico (em vez de 1 por tabela) simplifica: 1 LISTEN cobre tudo,
-- o Next filtra no nivel da API route baseado em autorizacao do user.
--
-- Payload JSON (exemplo):
--   {
--     "table": "cartoes",
--     "op": "UPDATE",
--     "id": "card-uuid",
--     "workspace_id": "ws-uuid",
--     "quadro_id": "q-uuid",
--     "coluna_id": "col-uuid"   -- opcional, so pra cartoes/comentarios
--   }
--
-- Aplicado quando STORAGE_DRIVER=local-disk OU quando operador quer
-- substituir o Supabase Realtime container por SSE leve. Se o
-- container Realtime estiver rodando (perfil full), pode-se pular
-- este script — ambos podem coexistir, mas e redundante.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- Funcao generica: pega o row (NEW em INSERT/UPDATE, OLD em DELETE),
-- extrai os ids relevantes e faz pg_notify.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_realtime_notify() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    payload jsonb;
    row_data record;
BEGIN
    -- Pega o row correto baseado na operacao
    IF TG_OP = 'DELETE' THEN
        row_data := OLD;
    ELSE
        row_data := NEW;
    END IF;

    -- Monta payload base
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', row_data.id
    );

    -- Adiciona ids de escopo dependendo da tabela
    CASE TG_TABLE_NAME
        WHEN 'quadros' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id
            );
        WHEN 'colunas' THEN
            payload := payload || jsonb_build_object(
                'quadro_id', row_data.quadro_id
            );
        WHEN 'cartoes' THEN
            payload := payload || jsonb_build_object(
                'coluna_id', row_data.coluna_id,
                'workspace_id', row_data.workspace_id
            );
        WHEN 'comentarios' THEN
            payload := payload || jsonb_build_object(
                'cartao_id', row_data.cartao_id
            );
        WHEN 'atividades' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id,
                'quadro_id', row_data.quadro_id,
                'cartao_id', row_data.cartao_id
            );
        WHEN 'notificacoes' THEN
            payload := payload || jsonb_build_object(
                'user_id', row_data.user_id
            );
        WHEN 'poker_sessoes' THEN
            payload := payload || jsonb_build_object(
                'workspace_id', row_data.workspace_id
            );
        WHEN 'poker_votos' THEN
            payload := payload || jsonb_build_object(
                'sessao_id', row_data.sessao_id
            );
        ELSE
            -- tabelas nao mapeadas: so table+op+id
            NULL;
    END CASE;

    -- pg_notify e limitado a 8KB por payload. Pra tabelas grandes (se
    -- algum dia alguem mandar row inteiro), truncar seria necessario.
    -- Hoje so mandamos ids, entao sempre cabe.
    PERFORM pg_notify('realtime_events', payload::text);

    RETURN NULL;  -- AFTER trigger nao precisa retornar NEW
END;
$$;

ALTER FUNCTION public.tg_realtime_notify() OWNER TO postgres;

-- ─────────────────────────────────────────────────────────────────────────
-- Triggers — AFTER INSERT/UPDATE/DELETE FOR EACH ROW
-- ─────────────────────────────────────────────────────────────────────────
-- Drop-and-recreate e idempotente.

DROP TRIGGER IF EXISTS tg_realtime_quadros       ON public.quadros;
DROP TRIGGER IF EXISTS tg_realtime_colunas       ON public.colunas;
DROP TRIGGER IF EXISTS tg_realtime_cartoes       ON public.cartoes;
DROP TRIGGER IF EXISTS tg_realtime_comentarios   ON public.comentarios;
DROP TRIGGER IF EXISTS tg_realtime_atividades    ON public.atividades;
DROP TRIGGER IF EXISTS tg_realtime_notificacoes  ON public.notificacoes;
DROP TRIGGER IF EXISTS tg_realtime_poker_sessoes ON public.poker_sessoes;
DROP TRIGGER IF EXISTS tg_realtime_poker_votos   ON public.poker_votos;

CREATE TRIGGER tg_realtime_quadros
    AFTER INSERT OR UPDATE OR DELETE ON public.quadros
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_colunas
    AFTER INSERT OR UPDATE OR DELETE ON public.colunas
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_cartoes
    AFTER INSERT OR UPDATE OR DELETE ON public.cartoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_comentarios
    AFTER INSERT OR UPDATE OR DELETE ON public.comentarios
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_atividades
    AFTER INSERT OR UPDATE OR DELETE ON public.atividades
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_notificacoes
    AFTER INSERT OR UPDATE OR DELETE ON public.notificacoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_poker_sessoes
    AFTER INSERT OR UPDATE OR DELETE ON public.poker_sessoes
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();

CREATE TRIGGER tg_realtime_poker_votos
    AFTER INSERT OR UPDATE OR DELETE ON public.poker_votos
    FOR EACH ROW EXECUTE FUNCTION public.tg_realtime_notify();
