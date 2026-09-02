/**
 * Changelog do produto.
 *
 * A PRIMEIRA entrada do array e a versao atual do app — nao existe outra
 * fonte de verdade. Isso e proposital: atrelar a versao ao package.json
 * exigiria expor o valor no client (NEXT_PUBLIC_* ou constante gerada no
 * build), e atrelar a um SHA de deploy transformaria todo hotfix num modal
 * na cara de todo mundo. Aqui VOCE decide o que e release: se nao adicionou
 * entrada, nao aparece nada.
 *
 * Como lancar uma versao:
 *   1. adiciona a entrada nova no TOPO do array;
 *   2. bump do "version" no package.json pro mesmo numero (cosmetico, mas
 *      evita os dois divergirem);
 *   3. deploy. No proximo login de cada pessoa, o modal aparece uma vez.
 *
 * Quem nunca viu nenhuma versao (cadastro novo, ou usuario que ja existia
 * antes da migration 059) NAO leva o changelog retroativo — ver a regra do
 * NULL em 059_versionamento_e_conquistas.sql.
 */

export type TipoItemChangelog = "novo" | "melhoria" | "correcao";

export interface ItemChangelog {
  tipo: TipoItemChangelog;
  texto: string;
}

export interface EntradaChangelog {
  /** Sem "v". Comparada como string exata, nao como semver. */
  versao: string;
  /** ISO curto (YYYY-MM-DD). So pra exibir. */
  data: string;
  /** Manchete da release, uma linha. */
  titulo: string;
  itens: ItemChangelog[];
}

export const ROTULO_TIPO: Record<TipoItemChangelog, string> = {
  novo: "Novo",
  melhoria: "Melhoria",
  correcao: "Correção",
};

export const CHANGELOG: EntradaChangelog[] = [
  {
    versao: "0.2.0",
    data: "2026-09-02",
    titulo: "Novidades, insígnias e um header mais confortável",
    itens: [
      {
        tipo: "novo",
        texto:
          "Esta tela: sempre que uma versão nova sair, você vê aqui o que mudou.",
      },
      {
        tipo: "novo",
        texto:
          "Insígnias de contribuição — quando uma sugestão sua vira melhoria de verdade, você recebe o reconhecimento em Configurações.",
      },
      {
        tipo: "melhoria",
        texto:
          "Barra de busca maior e ícones mais legíveis no topo, em telas grandes.",
      },
      {
        tipo: "melhoria",
        texto:
          "A descrição do cartão agora cresce conforme você escreve, em vez de ficar presa numa janelinha.",
      },
      {
        tipo: "correcao",
        texto:
          "O checklist de um cartão aparecia em outros cartões ao trocar de item.",
      },
    ],
  },
  {
    // Marco zero do changelog: o que ja estava no ar quando o versionamento
    // passou a existir. Ninguem recebe esta entrada como "novidade" — quem ja
    // era usuario foi carimbado direto na 0.2.0 (regra do NULL na migration
    // 059). Ela existe pra dar historico a quem abrir a lista, e pra servir de
    // ponto de partida.
    versao: "0.1.0",
    data: "2026-08-28",
    titulo: "O TaskFlow antes do versionamento",
    itens: [
      {
        tipo: "novo",
        texto:
          "Envio de feedback: sugestão ou relato de problema, direto do menu da conta.",
      },
      {
        tipo: "novo",
        texto:
          "Seleção múltipla no backlog para mover ou excluir várias tarefas de uma vez.",
      },
      {
        tipo: "novo",
        texto: "Plano PRO com selo em Configurações, destravando os recursos de IA.",
      },
      {
        tipo: "melhoria",
        texto:
          "A IA passou a aceitar lista pronta e texto longo no backlog, criando etiquetas novas.",
      },
      {
        tipo: "correcao",
        texto: "Mover cartão de coluna no celular sem depender do arraste.",
      },
    ],
  },
];

/** Versao que o app considera "atual". Nunca leia o package.json pra isto. */
export const VERSAO_ATUAL = CHANGELOG[0].versao;

/**
 * Se `versao` ainda existe no array.
 *
 * Falso quando a pessoa guardou uma versao que foi aparada do changelog, ou
 * quando houve rollback. Quem chama precisa tratar isso como "nao sei o que
 * essa pessoa ja viu" — ver o carimbo silencioso no useAvisos. Sem isso ela
 * ficaria presa: fila vazia pra sempre, coluna nunca atualizada, nenhum
 * release futuro exibido.
 */
export function versaoConhecida(versao: string | null): boolean {
  return versao !== null && CHANGELOG.some((e) => e.versao === versao);
}

/**
 * O que mostrar pra quem viu `vistaPor` por ultimo.
 *
 * Retorna as entradas MAIS NOVAS que `vistaPor`, da mais recente pra mais
 * antiga — quem ficou tres releases sem entrar ve as tres de uma vez, e nao
 * so a ultima. O modal rola quando sao muitas.
 *
 * Nulo ou desconhecida devolve lista vazia; nos dois casos quem decide o que
 * fazer e o useAvisos, que carimba a versao atual em silencio.
 *
 * AO APARAR entradas antigas daqui (o array cresce a cada release), lembre que
 * todo mundo parado numa versao removida cai no caso "desconhecida" e perde o
 * historico acumulado. Aparar so o que for mais velho que o release mais
 * antigo ainda em uso.
 */
export function novidadesDesde(vistaPor: string | null): EntradaChangelog[] {
  if (!versaoConhecida(vistaPor)) return [];
  const indice = CHANGELOG.findIndex((e) => e.versao === vistaPor);
  return CHANGELOG.slice(0, indice);
}
