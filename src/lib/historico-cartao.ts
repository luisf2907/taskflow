/**
 * Regras do historico de movimentacao dos cartoes (migration 060).
 *
 * Funcoes puras, sem Supabase nem React: o painel do cartao e a tela de
 * metricas leem os mesmos eventos e nao podem discordar sobre quanto tempo
 * um cartao passou numa coluna.
 */

export interface Movimentacao {
  id: string;
  cartao_id: string;
  tipo: "criado" | "movido";
  coluna_origem_id: string | null;
  coluna_origem_nome: string | null;
  coluna_destino_id: string | null;
  coluna_destino_nome: string | null;
  usuario_id: string | null;
  reconstruido: boolean;
  criado_em: string;
  /** Embutido pelo PostgREST a partir da FK usuario_id -> perfis. */
  perfis?: { nome: string | null } | null;
}

const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 24 * MS_POR_HORA;

/**
 * Nome pra exibir de um lado da movimentacao.
 *
 * id e nome nulos = backlog. Coluna excluida depois do evento mantem o nome
 * copiado na hora (a FK vira NULL, o nome fica), e a que ja estava excluida
 * quando o historico foi reconstruido chega como "coluna removida".
 */
export function nomeColuna(id: string | null, nome: string | null): string {
  if (nome) return nome;
  return id ? "coluna removida" : "Backlog";
}

/** Onde o cartao esta agora e desde quando, segundo o ultimo evento. */
export function permanenciaAtual(
  eventos: Movimentacao[],
  agoraMs: number,
): { coluna: string; desdeMs: number; duracaoMs: number } | null {
  if (eventos.length === 0) return null;
  const ultimo = ordenar(eventos)[eventos.length - 1];
  const desdeMs = Date.parse(ultimo.criado_em);
  return {
    coluna: nomeColuna(ultimo.coluna_destino_id, ultimo.coluna_destino_nome),
    desdeMs,
    duracaoMs: Math.max(agoraMs - desdeMs, 0),
  };
}

export interface TempoNaColuna {
  coluna: string;
  /** Media de permanencia, em ms. */
  mediaMs: number;
  /** Quantas passagens COMPLETAS entraram na conta. */
  passagens: number;
}

/**
 * Tempo medio em cada coluna, agrupado pelo NOME.
 *
 * Pelo nome porque cada sprint e um quadro com as proprias colunas, e
 * "Em Andamento" da sprint 3 e da sprint 4 sao a mesma etapa pra quem le a
 * metrica.
 *
 * So passagens completas contam — entrou e saiu. O tempo na coluna atual
 * ainda esta correndo; somar ele puxaria a media pra baixo em toda coluna
 * que tem cartao parado nela agora. Backlog fica de fora: o tempo antes de o
 * cartao entrar numa sprint nao e tempo de execucao.
 */
export function tempoPorColuna(eventos: Movimentacao[]): TempoNaColuna[] {
  const porCartao = new Map<string, Movimentacao[]>();
  for (const e of eventos) {
    const lista = porCartao.get(e.cartao_id);
    if (lista) lista.push(e);
    else porCartao.set(e.cartao_id, [e]);
  }

  const soma = new Map<string, { total: number; n: number }>();
  for (const lista of porCartao.values()) {
    const ordenada = ordenar(lista);
    for (let i = 0; i < ordenada.length - 1; i++) {
      const entrada = ordenada[i];
      if (!entrada.coluna_destino_id && !entrada.coluna_destino_nome) continue;
      const duracao =
        Date.parse(ordenada[i + 1].criado_em) - Date.parse(entrada.criado_em);
      if (!(duracao >= 0)) continue;
      const coluna = nomeColuna(entrada.coluna_destino_id, entrada.coluna_destino_nome);
      const acc = soma.get(coluna) ?? { total: 0, n: 0 };
      acc.total += duracao;
      acc.n += 1;
      soma.set(coluna, acc);
    }
  }

  return [...soma.entries()]
    .map(([coluna, { total, n }]) => ({ coluna, mediaMs: total / n, passagens: n }))
    .sort((a, b) => b.mediaMs - a.mediaMs);
}

export interface CartaoComDuracao {
  id: string;
  titulo: string;
  duracaoMs: number;
}

/**
 * Os n cartoes mais rapidos e mais lentos entre os concluidos, pelo tempo de
 * criacao ate conclusao. A tela ja mostrava minimo e maximo como numeros;
 * o pedido (feedback 9847728d) era saber QUAIS cartoes sao esses.
 */
export function extremosDeDuracao<
  T extends {
    id: string;
    titulo: string;
    criado_em: string | null;
    data_conclusao: string | null;
    concluido: boolean;
  },
>(cartoes: T[], n = 3): { rapidos: CartaoComDuracao[]; lentos: CartaoComDuracao[] } {
  const comDuracao = cartoes
    .filter((c) => c.concluido && c.criado_em && c.data_conclusao)
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      duracaoMs: Math.max(Date.parse(c.data_conclusao!) - Date.parse(c.criado_em!), 0),
    }))
    .filter((c) => Number.isFinite(c.duracaoMs))
    .sort((a, b) => a.duracaoMs - b.duracaoMs);

  // Com poucos cartoes as duas listas se sobreporiam; os lentos pegam so o
  // que nao entrou nos rapidos.
  const rapidos = comDuracao.slice(0, n);
  const lentos = comDuracao
    .slice(Math.max(rapidos.length, comDuracao.length - n))
    .reverse();
  return { rapidos, lentos };
}

/**
 * "40 min", "5 h", "3 dias". Arredonda pra unidade que a pessoa usaria ao
 * falar: ninguem diz "2,04 dias".
 */
export function formatarDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < MS_POR_HORA) {
    const min = Math.max(Math.round(ms / 60_000), 1);
    return `${min} min`;
  }
  if (ms < MS_POR_DIA) return `${Math.round(ms / MS_POR_HORA)} h`;
  const dias = ms / MS_POR_DIA;
  const arred = dias < 10 ? Math.round(dias * 10) / 10 : Math.round(dias);
  const texto = String(arred).replace(".", ",");
  return `${texto} ${arred === 1 ? "dia" : "dias"}`;
}

function ordenar(eventos: Movimentacao[]): Movimentacao[] {
  // Empate de horario: "criado" vem antes de qualquer movimento — na
  // reconstrucao, a criacao pode cair no mesmo instante do primeiro evento.
  return [...eventos].sort(
    (a, b) =>
      Date.parse(a.criado_em) - Date.parse(b.criado_em) ||
      (a.tipo === b.tipo ? 0 : a.tipo === "criado" ? -1 : 1),
  );
}
