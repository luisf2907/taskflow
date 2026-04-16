/**
 * Nome do cookie/localStorage usado pra guardar a sessao do Supabase.
 *
 * Por padrao, o SDK deriva o nome do URL (ex: "sb-<hostname>-auth-token").
 * No self-hosted, server-side e client-side usam URLs DIFERENTES pro mesmo
 * backend (ex: server=http://nginx:8000, client=http://localhost:8000).
 * Isso gera cookies com nomes diferentes → browser nao encontra a sessao
 * que o server criou.
 *
 * Fixar um nome constante em ambos os lados resolve.
 */
export const SUPABASE_STORAGE_KEY = "sb-taskflow-auth-token";
