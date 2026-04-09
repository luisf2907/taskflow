// =============================================
// WORKSPACES
// =============================================
export interface Workspace {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  colunas_padrao: string[];
  criado_em: string;
  atualizado_em: string;
}

export type StatusSprint = "planejada" | "ativa" | "concluida";

export interface Quadro {
  id: string;
  nome: string;
  cor: string;
  workspace_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status_sprint: StatusSprint;
  meta: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Coluna {
  id: string;
  quadro_id: string;
  nome: string;
  posicao: number;
  criado_em: string;
}

export interface PRHistorico {
  numero: number;
  url: string;
  status: "open" | "closed" | "merged";
  autor: string;
  data: string;
}

export interface Cartao {
  id: string;
  coluna_id: string | null;
  workspace_id: string | null;
  titulo: string;
  descricao: string | null;
  posicao: number;
  data_entrega: string | null;
  peso: number | null;
  pr_numero: number | null;
  pr_url: string | null;
  pr_status: "open" | "closed" | "merged" | null;
  pr_repo_id: string | null;
  pr_autor: string | null;
  pr_historico: PRHistorico[] | null;
  branch: string | null;
  branch_repo_id: string | null;
  data_conclusao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ColunaComCartoes extends Coluna {
  cartoes: Cartao[];
}

// =============================================
// ETIQUETAS CUSTOMIZÁVEIS
// =============================================
export interface Etiqueta {
  id: string;
  quadro_id: string | null;
  workspace_id: string | null;
  nome: string;
  cor: string;
  criado_em: string;
}

export interface CartaoEtiqueta {
  id: string;
  cartao_id: string;
  etiqueta_id: string;
}

// =============================================
// MEMBROS
// =============================================
export interface Membro {
  id: string;
  workspace_id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  cor_avatar: string;
  avatar_url: string | null;
  criado_em: string;
}

export interface CartaoMembro {
  id: string;
  cartao_id: string;
  membro_id: string;
}

// =============================================
// CHECKLISTS
// =============================================
export interface Checklist {
  id: string;
  cartao_id: string;
  titulo: string;
  posicao: number;
  criado_em: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  texto: string;
  concluido: boolean;
  posicao: number;
  criado_em: string;
}

export interface ChecklistComItens extends Checklist {
  checklist_itens: ChecklistItem[];
}

// =============================================
// COMENTÁRIOS
// =============================================
export interface Comentario {
  id: string;
  cartao_id: string;
  membro_id: string | null;
  texto: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ComentarioComAutor extends Comentario {
  membros: Membro | null;
}

// =============================================
// ANEXOS
// =============================================
export interface Anexo {
  id: string;
  cartao_id: string;
  nome: string;
  url: string;
  tipo: string | null;
  tamanho: number | null;
  criado_em: string;
}

// =============================================
// CARTÃO ENRIQUECIDO (para exibição no board)
// =============================================
export interface CartaoEnriquecido extends Cartao {
  cartao_etiquetas: { etiqueta_id: string }[];
  cartao_membros: { membro_id: string }[];
  total_checklist_itens: number;
  total_checklist_concluidos: number;
  total_anexos: number;
}

// =============================================
// PERFIS (auth)
// =============================================
export interface NotifPreferences {
  email_convite: boolean;
  email_card_atribuido: boolean;
  email_digest_semanal: boolean;
  inapp_todas: boolean;
}

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  github_username: string | null;
  notif_preferences: NotifPreferences | null;
  onboarding_done: boolean | null;
  onboarding_step: number | null;
  criado_em: string;
  atualizado_em: string;
  // TaskFlow Voice (nullable ate o usuario cadastrar a voz)
  // voice_embedding nunca e lido do client — fica so no server pra matching.
  voice_enrolled_at: string | null;
  voice_consent_at: string | null;
  // Paleta personalizada (JSONB) — null = padrao
  theme_preferences: Record<string, string> | null;
}

// =============================================
// REUNIOES (voice meetings)
// =============================================
export type ReuniaoStatus = "pending" | "processing" | "done" | "error";

export interface Reuniao {
  id: string;
  workspace_id: string;
  titulo: string;
  descricao: string | null;
  audio_path: string | null;
  audio_size_bytes: number | null;
  audio_mime: string | null;
  status: ReuniaoStatus;
  erro_mensagem: string | null;
  duracao_seg: number | null;
  language: string | null;
  language_probability: number | null;
  timings_ms: Record<string, number> | null;
  criado_por: string | null;
  criado_em: string;
  processado_em: string | null;
  atualizado_em: string;
}

export type MatchTipo = "strong" | "weak" | "none" | "manual";

export interface ReuniaoFala {
  id: string;
  reuniao_id: string;
  ordem: number;
  inicio_ms: number;
  fim_ms: number;
  speaker_label: string;
  usuario_id: string | null;
  match_confianca: number | null;
  match_tipo: MatchTipo | null;
  texto: string;
}

// =============================================
// WORKSPACE MEMBERSHIP
// =============================================
export interface WorkspaceUsuario {
  id: string;
  workspace_id: string;
  user_id: string;
  papel: "admin" | "membro";
  criado_em: string;
  perfis?: Perfil;
}

// =============================================
// AUTOMAÇÕES
// =============================================
export type TriggerTipo = "card_moved_to_column" | "card_created" | "pr_merged" | "pr_opened" | "pr_closed";
export type AcaoTipo = "move_to_column" | "assign_member" | "add_label";

export interface Automacao {
  id: string;
  workspace_id: string;
  nome: string;
  trigger_tipo: TriggerTipo;
  trigger_config: Record<string, string>;
  acao_tipo: AcaoTipo;
  acao_config: Record<string, string>;
  ativo: boolean;
  criado_em: string;
}

// =============================================
// ATIVIDADES (Activity Log)
// =============================================
export type AcaoAtividade =
  | "criar" | "mover" | "atualizar" | "excluir"
  | "comentar" | "atribuir" | "etiquetar" | "sprint_status";

export type EntidadeAtividade =
  | "cartao" | "coluna" | "comentario" | "membro" | "etiqueta" | "sprint";

export interface Atividade {
  id: string;
  workspace_id: string | null;
  quadro_id: string | null;
  cartao_id: string | null;
  user_id: string;
  acao: AcaoAtividade;
  entidade: EntidadeAtividade;
  detalhes: Record<string, unknown>;
  criado_em: string;
}

export interface AtividadeComAutor extends Atividade {
  perfis: Perfil | null;
}

// =============================================
// NOTIFICAÇÕES
// =============================================
export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  lida: boolean;
  link: string | null;
  criado_em: string;
}

// =============================================
// AUTOMAÇÃO LOGS
// =============================================
export interface AutomacaoLog {
  id: string;
  automacao_id: string;
  automacao_nome: string;
  trigger_tipo: string;
  acao_tipo: string;
  cartao_id: string | null;
  cartao_titulo: string | null;
  workspace_id: string;
  sucesso: boolean;
  erro: string | null;
  criado_em: string;
}

// =============================================
// PLANNING POKER
// =============================================
export type PokerStatus = "votando" | "revelado" | "finalizado";

export const POKER_VALORES = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "cafe"] as const;
export type PokerValor = (typeof POKER_VALORES)[number];

export interface PokerSessao {
  id: string;
  workspace_id: string;
  cartao_id: string;
  criado_por: string;
  status: PokerStatus;
  resultado_final: number | null;
  criado_em: string;
  atualizado_em: string;
}

export interface PokerVoto {
  id: string;
  sessao_id: string;
  membro_id: string;
  user_id: string;
  valor: string;
  criado_em: string;
}
