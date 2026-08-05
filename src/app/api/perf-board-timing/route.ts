/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ROTA TEMPORARIA — APAGAR DEPOIS DE MEDIR                            ║
 * ║  Pasta inteira: src/app/api/perf-board-timing/                       ║
 * ║  (sem underscore no nome: `_pasta` e private folder no App Router     ║
 * ║   e nao gera rota nenhuma)                                            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Mede quanto custa `get_board_data` chamado DO SERVIDOR, que e a
 * incognita que decide o item 7 do diagnostico (Server Components).
 *
 * A conta:
 *
 *   hoje    TTFB 160ms -> baixa/hidrata JS -> get_board_data -> pinta
 *   depois  TTFB 160ms + S -> HTML ja vem com os cards -> pinta
 *
 * onde S e o que esta rota mede. Se S for bem menor que o "atraso na
 * renderizacao do elemento" que o Lighthouse reportou (740ms), mover a
 * busca pro servidor derruba a LCP. Se for parecido ou maior, so troca
 * o tempo de lugar e nao vale a reestruturacao.
 *
 * IMPORTANTE: rodar na sua maquina mede a SUA rede ate o Supabase, nao a do
 * servidor que atende os usuarios. O numero que decide e o do ambiente
 * publicado — rodar esta mesma URL la. E ele pode ser melhor OU pior que o
 * local: depende de onde o servidor esta em relacao ao Supabase.
 *   - Supabase self-hosted no mesmo host -> loopback, alguns milissegundos.
 *   - Supabase cloud, servidor na mesma regiao -> tipicamente melhor que local.
 *   - Supabase cloud, servidor em outro continente -> pode ser bem pior.
 *
 * Um detalhe que ajuda em servidor proprio: o processo Node fica de pe, entao
 * o keep-alive da conexao com o Supabase sobrevive entre requests. O custo de
 * conexao (`conexaoAproximada`) e pago uma vez, nao a cada request — que e
 * exatamente o que a medida "conexao quente" abaixo representa.
 *
 * Uso:
 *   /api/perf-board-timing                  -> escolhe um board sozinho
 *   /api/perf-board-timing?quadro=<uuid>    -> board especifico
 *   /api/perf-board-timing?n=10             -> numero de repeticoes
 */
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { hostname } from "node:os";

function ms(inicio: number) {
  return Math.round((performance.now() - inicio) * 10) / 10;
}

/**
 * Descreve onde o servidor Next esta rodando e como ele alcanca o Supabase.
 * Sem heuristica de Vercel: o que importa e (a) se este processo e o que
 * atende os usuarios, e (b) se o Supabase e loopback, LAN ou internet.
 */
function ondeEstou() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let supabaseHost = "?";
  try {
    supabaseHost = new URL(url).hostname;
  } catch {
    /* env ausente ou malformada — segue com "?" */
  }

  const ehLoopback =
    supabaseHost === "localhost" ||
    supabaseHost === "127.0.0.1" ||
    supabaseHost === "::1" ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(supabaseHost) ||
    // nome de servico do docker-compose (sem ponto) — mesma rede do container
    (!supabaseHost.includes(".") && supabaseHost !== "?");

  const alcance = ehLoopback
    ? "mesmo host / mesma rede docker"
    : supabaseHost.endsWith(".supabase.co")
      ? "Supabase cloud, pela internet"
      : "host externo, pela internet";

  return {
    servidorNode: hostname(),
    plataforma: process.env.VERCEL
      ? `vercel (${process.env.VERCEL_REGION ?? "regiao ?"})`
      : "servidor proprio",
    supabase: { host: supabaseHost, alcance },
    aviso: ehLoopback
      ? "Supabase no mesmo host: o custo abaixo e praticamente so execucao de query. Esse numero nao muda com a rede do usuario."
      : "Rode esta URL NO SERVIDOR QUE ATENDE OS USUARIOS. Rodando na sua maquina, o numero e a sua rede ate o Supabase, nao a dele — pode ser melhor ou pior.",
  };
}

function estatisticas(amostras: number[]) {
  const ordenado = [...amostras].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return {
    min: ordenado[0],
    mediana:
      ordenado.length % 2 === 0
        ? Math.round(((ordenado[meio - 1] + ordenado[meio]) / 2) * 10) / 10
        : ordenado[meio],
    max: ordenado[ordenado.length - 1],
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();

  // Exige sessao — a rota le dados de board.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const repeticoes = Math.min(Math.max(Number(params.get("n")) || 5, 1), 20);
  let quadroId = params.get("quadro");

  // ── 1. Round-trip trivial: separa custo de conexao do custo da query ──
  const t0 = performance.now();
  await supabase.from("quadros").select("id").limit(1);
  const primeiroRoundTrip = ms(t0);

  // Se nao passaram board, pega o que tem mais cartoes (mais representativo).
  if (!quadroId) {
    const { data: colunas } = await supabase
      .from("colunas")
      .select("quadro_id")
      .limit(1000);
    const contagem: Record<string, number> = {};
    for (const c of colunas || []) {
      contagem[c.quadro_id] = (contagem[c.quadro_id] || 0) + 1;
    }
    quadroId = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  if (!quadroId) {
    return NextResponse.json(
      { error: "Nenhum board acessivel encontrado" },
      { status: 404 },
    );
  }

  // ── 2. Conexao ja quente: mede a query em si, N vezes ──
  const amostras: number[] = [];
  let bytesPayload = 0;

  for (let i = 0; i < repeticoes; i++) {
    const t = performance.now();
    const { data, error } = await supabase.rpc("get_board_data", {
      p_quadro_id: quadroId,
    });
    amostras.push(ms(t));

    if (error) {
      return NextResponse.json(
        { error: "get_board_data falhou", detalhe: error.message },
        { status: 500 },
      );
    }
    if (i === 0) bytesPayload = JSON.stringify(data).length;
  }

  const stats = estatisticas(amostras);

  // ── 3. Veredito ──
  // 740ms e o "atraso na renderizacao do elemento" medido no Lighthouse:
  // o tempo entre o HTML chegar e os cards pintarem, hoje gasto baixando
  // JS, hidratando e so entao buscando os dados.
  const ATRASO_ATUAL_MS = 740;
  const ganhoEstimado = Math.round(ATRASO_ATUAL_MS - stats.mediana);

  return NextResponse.json(
    {
      onde: ondeEstou(),
      board: { quadroId, payloadBytes: bytesPayload },
      medidas_ms: {
        primeiroRoundTrip,
        conexaoAproximada: Math.max(0, Math.round(primeiroRoundTrip - stats.min)),
        getBoardData: { ...stats, amostras, repeticoes },
      },
      projecao: {
        atrasoDeRenderizacaoHoje: ATRASO_ATUAL_MS,
        custoNovoNoTTFB: stats.mediana,
        ganhoLiquidoEstimadoMs: ganhoEstimado,
        veredito:
          ganhoEstimado > 300
            ? "VALE — a busca no servidor sai bem mais barata que o atraso atual."
            : ganhoEstimado > 0
              ? "MARGINAL — ganha pouco; streaming com Suspense provavelmente rende mais."
              : "NAO VALE do jeito simples — o TTFB cresceria mais do que a LCP cairia. Considerar streaming com Suspense, que mantem o TTFB baixo.",
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
