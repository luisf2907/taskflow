import { createServerClient } from "@/lib/supabase/server";
import { exigirPro } from "@/lib/plano";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { trackEvent } from "@/lib/umami";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obterLlm } from "@/lib/drivers/llm";
import type { LlmDriver } from "@/lib/drivers/llm";
import { parseAIResponse } from "@/lib/ai-json-repair";
import {
  LIMITES,
  planejar,
  type ItemLista,
  type ModoGeracao,
} from "@/lib/ai/backlog-input";
import {
  idsDoCard,
  resolverEtiquetas,
  type EtiquetaExistente,
} from "@/lib/ai/etiquetas-sugeridas";

// ═══════════════════════════════════════════════════════════════════════
// POST /api/ai/generate-cards — responde NDJSON em streaming
// ═══════════════════════════════════════════════════════════════════════
// O modo lista processa ate 40 itens em lotes, o que leva dezenas de
// segundos. Uma resposta unica deixaria a tela num spinner cego todo esse
// tempo; aqui cada lote concluido vira um evento e a UI conta o progresso
// de verdade.
//
// Eventos (uma linha JSON cada):
//   {tipo:"inicio", modo, itens, lotes, ignorados}
//   {tipo:"lote", feito, total}
//   {tipo:"fim", cards, etiquetas_novas, crus, recusadas}
//   {tipo:"erro", error}
//
// Erros ANTES do stream (auth, plano, validacao, rate limit) continuam
// saindo como JSON com status HTTP — o cliente distingue pelo content-type.
// ═══════════════════════════════════════════════════════════════════════

const schema = z.object({
  texto: z
    .string()
    .min(3, "Texto muito curto")
    .max(LIMITES.TEXTO_MAX, `Texto muito longo (max ${LIMITES.TEXTO_MAX} caracteres)`),
  workspaceId: z.string().uuid("Workspace ID invalido"),
  etiquetas: z
    .array(z.object({ id: z.string(), nome: z.string(), cor: z.string() }))
    .optional(),
  modo: z.enum(["auto", "requisito", "lista"]).optional().default("auto"),
});

const FIBONACCI = [1, 2, 3, 5, 8, 13];

/** Orcamento de saida por chamada. Lote de lista e curto; requisito e rico. */
const TOKENS_LOTE = 3000;
const TOKENS_REQUISITO = 8000;

interface CardBruto {
  titulo?: unknown;
  descricao?: unknown;
  peso?: unknown;
  checklist?: unknown;
  etiquetas?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────────────────
// Os limites aparecem por extenso, e nao so no esquema JSON, porque o
// esquema nao e garantido: o driver openai-compat desce pra json_object
// quando o servidor recusa json_schema, e ai a forma so existe no texto.
// Quem realmente segura os tetos e a sanitizacao no fim deste arquivo.

function secaoEtiquetas(etiquetas: EtiquetaExistente[]): string {
  if (etiquetas.length === 0) {
    return "\n- etiquetas: 0 a 3 nomes curtos (1-2 palavras), em minusculas.";
  }
  return `\n- etiquetas: 0 a 3 nomes curtos (1-2 palavras). Reaproveite pelo nome exato quando servir: ${etiquetas
    .map((e) => e.nome)
    .join(", ")}. Se nenhuma servir, proponha um nome novo curto.`;
}

function promptRequisito(etiquetas: EtiquetaExistente[]): string {
  return `Voce quebra requisitos em cards de tarefa. Texto plano, sem markdown/emoji.

Gere no maximo ${LIMITES.CARDS_REQUISITO} cards.
- titulo: imperativo curto (<60 chars). Nao use formato user story.
- descricao: "Como [persona], quero [acao] para [beneficio]." + 1 frase tecnica. Max 250 chars.
- peso: fibonacci (1,2,3,5,8,13).
- checklist: 3-5 criterios acionaveis curtos (<80 chars cada).${secaoEtiquetas(etiquetas)}

Responda com um array JSON.`;
}

function promptLista(itens: ItemLista[], etiquetas: EtiquetaExistente[]): string {
  const lista = itens
    .map(
      (it, i) =>
        `${i + 1}. ${it.texto}` +
        it.subitens.map((s) => `\n   - ${s}`).join("")
    )
    .join("\n");

  return `Voce converte itens de uma lista de tarefas em cards. Texto plano, sem markdown/emoji.

Devolva EXATAMENTE ${itens.length} card(s), um por item, na mesma ordem.
Nao invente tarefas, nao junte nem divida itens, nao troque o assunto de um item.
- titulo: o proprio item, apenas limpo e em imperativo (<60 chars). Preserve o vocabulario do autor.
- descricao: "" quando o item ja se explica. So escreva se o item for ambiguo, em 1 frase de ate 120 chars. NUNCA invente user story aqui.
- peso: fibonacci (1,2,3,5,8,13), estimado pelo tamanho aparente da tarefa.
- checklist: apenas os subitens dados abaixo do item; se nao houver, [].${secaoEtiquetas(etiquetas)}

Itens:
${lista}

Responda com um array JSON.`;
}

function esquemaCards(maxItems: number) {
  return {
    type: "array",
    maxItems,
    items: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        descricao: { type: "string" },
        peso: { type: "number" },
        checklist: { type: "array", maxItems: 5, items: { type: "string" } },
        etiquetas: { type: "array", maxItems: 3, items: { type: "string" } },
      },
      required: ["titulo", "descricao", "peso", "checklist", "etiquetas"],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Geracao
// ─────────────────────────────────────────────────────────────────────────

/** Item que a IA nao conseguiu processar vira card mesmo assim, sem enriquecer. */
function cardCru(item: ItemLista): CardBruto {
  return {
    titulo: item.texto,
    descricao: "",
    peso: 3,
    checklist: item.subitens,
    etiquetas: [],
  };
}

/**
 * Gera um lote, cortando o lote ao meio quando a resposta trunca ou nao
 * parseia. Um lote de 10 que estoura vira dois de 5, e assim por diante.
 *
 * Chegando a um item so e ainda falhando, o item volta cru em vez de sumir:
 * perder a tarefa que a pessoa escreveu e pior que entregar ela sem peso e
 * sem checklist.
 */
async function gerarLote(
  driver: LlmDriver,
  itens: ItemLista[],
  etiquetas: EtiquetaExistente[],
  crus: { total: number }
): Promise<CardBruto[]> {
  let resposta;
  try {
    resposta = await driver.gerarJson({
      prompt: promptLista(itens, etiquetas),
      temperatura: 0.2,
      maxTokens: TOKENS_LOTE,
      esquema: esquemaCards(itens.length),
    });
  } catch (err) {
    if (itens.length === 1) {
      crus.total += 1;
      return [cardCru(itens[0])];
    }
    throw err;
  }

  const cards =
    resposta.motivoParada === "limite_tokens"
      ? null
      : await parseAIResponse<CardBruto[]>(resposta.texto, "array", driver);

  if (!cards || cards.length === 0) {
    if (itens.length === 1) {
      crus.total += 1;
      return [cardCru(itens[0])];
    }
    const meio = Math.ceil(itens.length / 2);
    const [a, b] = [
      await gerarLote(driver, itens.slice(0, meio), etiquetas, crus),
      await gerarLote(driver, itens.slice(meio), etiquetas, crus),
    ];
    return [...a, ...b];
  }

  // Veio menos card que item: completa a cauda com os itens crus, para que
  // nenhum item colado desapareca sem aviso.
  if (cards.length < itens.length) {
    const faltantes = itens.slice(cards.length);
    crus.total += faltantes.length;
    return [...cards, ...faltantes.map(cardCru)];
  }

  return cards.slice(0, itens.length);
}

// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "ai-generate", { maxRequests: 5 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // IA e recurso do plano PRO (migration 057).
  const semPro = await exigirPro(supabase, user.id);
  if (semPro) return semPro;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { texto, modo: modoPedido } = parsed.data;
  const etiquetas: EtiquetaExistente[] = parsed.data.etiquetas ?? [];

  const llm = obterLlm();
  if (!llm.ok) {
    return NextResponse.json({ error: llm.motivo }, { status: 503 });
  }
  const driver = llm.driver;

  const plano = planejar(texto, modoPedido);

  // Lista sem nenhum item reconhecido: cai pra requisito em vez de devolver
  // zero cards. So acontece se o pedido veio forcado como "lista".
  const modo: ModoGeracao =
    plano.modo === "lista" && plano.itens.length === 0 ? "requisito" : plano.modo;

  void trackEvent("ai_generate_cards", {
    user_id: user.id,
    texto_len: texto.length,
    num_etiquetas: etiquetas.length,
    modo,
    itens: plano.itens.length,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const envia = (evento: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(evento) + "\n"));

      try {
        const lotes = modo === "lista" ? plano.lotes : [[]];
        envia({
          tipo: "inicio",
          modo,
          itens: plano.itens.length,
          lotes: lotes.length,
          ignorados: plano.ignorados,
        });

        const crus = { total: 0 };
        const brutos: CardBruto[] = [];

        if (modo === "lista") {
          for (let i = 0; i < lotes.length; i++) {
            brutos.push(...(await gerarLote(driver, lotes[i], etiquetas, crus)));
            envia({ tipo: "lote", feito: i + 1, total: lotes.length });
          }
        } else {
          const resposta = await driver.gerarJson({
            prompt: `${promptRequisito(etiquetas)}\n\nRequisito:\n${texto}`,
            temperatura: 0.3,
            maxTokens: TOKENS_REQUISITO,
            esquema: esquemaCards(LIMITES.CARDS_REQUISITO),
          });

          const cards = await parseAIResponse<CardBruto[]>(
            resposta.texto,
            "array",
            driver
          );

          if (!cards || cards.length === 0) {
            console.error("[generate-cards] IA retornou formato invalido", {
              driver: driver.nome,
              modelo: driver.modelo,
              motivoParada: resposta.motivoParada,
              snippet: resposta.texto.slice(0, 500),
            });
            envia({
              tipo: "erro",
              error:
                resposta.motivoParada === "limite_tokens"
                  ? "A resposta foi muito longa. Tente descrever em menos detalhes."
                  : resposta.motivoParada === "bloqueado"
                    ? "A IA recusou processar esse conteudo. Tente reformular."
                    : "A IA nao conseguiu gerar cards. Tente descrever melhor o que precisa.",
            });
            return;
          }
          brutos.push(...cards);
          envia({ tipo: "lote", feito: 1, total: 1 });
        }

        // Etiquetas: o modelo devolveu nomes; aqui viram ids existentes ou
        // propostas de etiqueta nova.
        const nomes = brutos.flatMap((c) =>
          Array.isArray(c.etiquetas) ? c.etiquetas.map((n) => String(n ?? "")) : []
        );
        const resolucao = resolverEtiquetas(nomes, etiquetas);

        const teto = modo === "lista" ? LIMITES.CARDS_LISTA : LIMITES.CARDS_REQUISITO;
        const cards = brutos
          .slice(0, teto)
          .map((card) => ({
            titulo: stripFormatting(String(card.titulo || "")).slice(0, 200),
            descricao: stripFormatting(String(card.descricao || "")).slice(0, 2000),
            peso: FIBONACCI.includes(card.peso as number) ? (card.peso as number) : 3,
            checklist: Array.isArray(card.checklist)
              ? card.checklist
                  .slice(0, 10)
                  .map((item: unknown) => stripFormatting(String(item || "")))
                  .filter((s: string) => s.length > 0)
              : [],
            etiqueta_ids: idsDoCard(card.etiquetas, resolucao),
          }))
          .filter((c) => c.titulo.length > 0);

        envia({
          tipo: "fim",
          cards,
          etiquetas_novas: resolucao.novas,
          crus: crus.total,
          recusadas: resolucao.recusadas,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[generate-cards] falhou", {
          driver: driver.nome,
          modelo: driver.modelo,
          message,
        });
        envia({
          tipo: "erro",
          error:
            message.includes("API_KEY") ||
            message.includes("403") ||
            message.includes("401")
              ? "Chave da API do provedor de IA invalida ou sem permissao."
              : "Erro ao gerar cards com IA. Tente novamente.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
