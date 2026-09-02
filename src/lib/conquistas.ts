/**
 * Catalogo de insignias.
 *
 * Conteudo aqui, estado no banco (tabela `conquistas`) — mesma divisao do
 * changelog. Trocar o texto ou o icone de uma insignia e um deploy, nao uma
 * migration.
 *
 * Ao adicionar um tipo novo, atualize TAMBEM o CHECK de
 * `conquistas_tipo_check` na migration (uma nova, nao editando a 059) —
 * senao o INSERT do CLI e recusado pelo banco.
 */

export type TipoConquista = "feedback_implementado";

export interface DefinicaoConquista {
  /** Emoji. Fica num circulo grande no modal e pequeno na lista. */
  icone: string;
  nome: string;
  /** Frase curta no perfil, abaixo do nome. */
  descricao: string;
  /** Titulo da tela de comemoracao. */
  tituloCelebracao: string;
  /** Corpo do agradecimento. Aparece uma vez, no primeiro login apos ganhar. */
  mensagemCelebracao: string;
}

export const CATALOGO_CONQUISTAS: Record<TipoConquista, DefinicaoConquista> = {
  feedback_implementado: {
    icone: "🏅",
    nome: "Voz que virou produto",
    descricao: "Uma sugestão sua foi implementada no TaskFlow.",
    tituloCelebracao: "Sua sugestão virou realidade",
    mensagemCelebracao:
      "Você mandou uma sugestão e ela virou parte do TaskFlow. Obrigado por reservar um tempo pra escrever — é assim que o produto melhora de verdade.",
  },
};

/**
 * Busca no catalogo sem estourar se o banco tiver um tipo que este build nao
 * conhece — acontece quando o CLI (rodando de um checkout mais novo) premia
 * com um tipo que o front em producao ainda nao subiu.
 */
export function definicaoConquista(
  tipo: string
): DefinicaoConquista | undefined {
  return CATALOGO_CONQUISTAS[tipo as TipoConquista];
}
