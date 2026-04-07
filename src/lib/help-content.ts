// =============================================
// HELP CENTER CONTENT
// =============================================
// Estrutura de dados dos artigos do Help Center
// Editavel sem quebrar nada (so adicionar/remover items do array)
// =============================================

export type HelpBlockTipo = "paragrafo" | "lista" | "passos" | "alerta" | "codigo" | "titulo";
export type AlertaVariante = "info" | "warning" | "success" | "tip";

export interface HelpBlock {
  tipo: HelpBlockTipo;
  conteudo: string | string[];
  nivel?: number;
  variante?: AlertaVariante;
}

export interface HelpArticle {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  tags: string[];
  conteudo: HelpBlock[];
  popular?: boolean;
}

export interface HelpCategoria {
  id: string;
  nome: string;
  icone: string; // nome do icone lucide
  descricao: string;
  ordem: number;
}

// =============================================
// CATEGORIAS
// =============================================

export const CATEGORIAS: HelpCategoria[] = [
  { id: "comecando", nome: "Começando", icone: "Sparkles", descricao: "Primeiros passos no TaskFlow", ordem: 1 },
  { id: "workspaces", nome: "Workspaces", icone: "Folder", descricao: "Organize seus times e projetos", ordem: 2 },
  { id: "sprints", nome: "Sprints", icone: "Calendar", descricao: "Quadros Kanban e gestao de sprints", ordem: 3 },
  { id: "cards", nome: "Cards", icone: "Kanban", descricao: "Gerenciamento de tarefas", ordem: 4 },
  { id: "github", nome: "GitHub", icone: "GitBranch", descricao: "Integracao com repositorios", ordem: 5 },
  { id: "poker", nome: "Planning Poker", icone: "Dices", descricao: "Estimativa colaborativa", ordem: 6 },
  { id: "ia", nome: "Inteligência Artificial", icone: "Bot", descricao: "Recursos de IA com Gemini", ordem: 7 },
  { id: "import-export", nome: "Importar/Exportar", icone: "Upload", descricao: "Migracao e backup de dados", ordem: 8 },
  { id: "config", nome: "Configurações", icone: "Settings", descricao: "Perfil, notificacoes e API", ordem: 9 },
  { id: "atalhos", nome: "Atalhos", icone: "Keyboard", descricao: "Atalhos de teclado", ordem: 10 },
  { id: "faq", nome: "FAQ", icone: "HelpCircle", descricao: "Perguntas frequentes", ordem: 11 },
];

// =============================================
// ARTIGOS
// =============================================

export const ARTIGOS: HelpArticle[] = [
  // ─────────────────────────────────────────────
  // COMECANDO
  // ─────────────────────────────────────────────
  {
    id: "bem-vindo",
    categoria: "comecando",
    titulo: "Bem-vindo ao TaskFlow",
    descricao: "O que e o TaskFlow e para que serve",
    tags: ["intro", "comecando"],
    popular: true,
    conteudo: [
      { tipo: "paragrafo", conteudo: "TaskFlow e uma plataforma de gestao de projetos focada em times de desenvolvimento. Combina quadros Kanban, sprints, integracao profunda com GitHub, Planning Poker e inteligencia artificial em um so lugar." },
      { tipo: "titulo", conteudo: "Por que TaskFlow?", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Kanban com drag-and-drop, sprints e backlog organizados",
        "Integracao GitHub completa: branches, PRs, webhooks",
        "Planning Poker integrado para estimativa em equipe",
        "IA (Gemini) para gerar e melhorar cards automaticamente",
        "Dashboard em tempo real com metricas e burndown",
        "Gratis durante o beta — sem cartao de credito",
      ]},
      { tipo: "alerta", variante: "tip", conteudo: "Pressione ? em qualquer lugar do app para abrir esta central de ajuda." },
    ],
  },
  {
    id: "criando-conta",
    categoria: "comecando",
    titulo: "Criando sua conta",
    descricao: "Cadastre-se com email ou GitHub",
    tags: ["cadastro", "login", "conta"],
    popular: true,
    conteudo: [
      { tipo: "paragrafo", conteudo: "Criar uma conta no TaskFlow leva menos de 1 minuto. Voce pode usar email/senha ou se conectar diretamente com sua conta GitHub." },
      { tipo: "titulo", conteudo: "Cadastro com email", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Acesse a pagina de login",
        "Clique em 'Cadastre-se'",
        "Informe seu nome, email e senha (minimo 6 caracteres)",
        "Confirme o email enviado para sua caixa de entrada",
        "Pronto! Voce sera redirecionado ao dashboard",
      ]},
      { tipo: "titulo", conteudo: "Cadastro com GitHub", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Na pagina de login, clique em 'Continuar com GitHub'",
        "Autorize o TaskFlow no GitHub",
        "Voce sera redirecionado automaticamente ao dashboard",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "Conectar com GitHub habilita features extras como criacao de branches, PRs e webhooks direto do app." },
    ],
  },
  {
    id: "tour-interface",
    categoria: "comecando",
    titulo: "Tour pela interface",
    descricao: "Conheca as areas principais do app",
    tags: ["interface", "navegacao", "tour"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "O TaskFlow tem 3 areas principais: Sidebar (esquerda), Header (topo) e Conteudo (centro)." },
      { tipo: "titulo", conteudo: "Sidebar", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Logo do TaskFlow no topo",
        "Lista de workspaces (clique para acessar)",
        "Lista de sprints recentes",
        "Botao para criar nova sprint",
      ]},
      { tipo: "titulo", conteudo: "Header", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Barra de busca global (Ctrl+K)",
        "Sino de notificacoes",
        "Botao de help (este lugar!)",
        "Toggle de tema claro/escuro",
        "Menu do perfil",
      ]},
      { tipo: "titulo", conteudo: "Conteudo", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Area principal onde voce ve o dashboard, kanban, backlog, metricas, etc. Muda dependendo da pagina." },
    ],
  },

  // ─────────────────────────────────────────────
  // WORKSPACES
  // ─────────────────────────────────────────────
  {
    id: "o-que-e-workspace",
    categoria: "workspaces",
    titulo: "O que e um workspace",
    descricao: "Conceito e organizacao",
    tags: ["workspace", "conceito"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "Um workspace e o container principal para um projeto ou equipe. Tudo dentro do TaskFlow vive dentro de um workspace: sprints, cards, membros, repositorios, etiquetas." },
      { tipo: "titulo", conteudo: "Quando criar um novo workspace?", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Cada projeto distinto da empresa",
        "Cada cliente que voce atende",
        "Cada produto que voce desenvolve",
        "Times separados que nao precisam compartilhar dados",
      ]},
      { tipo: "alerta", variante: "tip", conteudo: "Voce pode ter quantos workspaces quiser. E cada um tem isolamento total — membros de um nao veem dados de outro." },
    ],
  },
  {
    id: "criar-workspace",
    categoria: "workspaces",
    titulo: "Criando um workspace",
    descricao: "Passo a passo para criar e configurar",
    tags: ["criar", "workspace"],
    popular: true,
    conteudo: [
      { tipo: "passos", conteudo: [
        "No dashboard, clique em '+ Novo Workspace'",
        "Informe um nome (ex: 'Projeto Acme')",
        "Escolha uma cor para identificacao visual",
        "(Opcional) adicione uma descricao",
        "Clique em 'Criar workspace'",
      ]},
      { tipo: "paragrafo", conteudo: "Pronto! Voce sera redirecionado para o workspace. Ele ja vem com colunas Kanban padrao (A fazer, Em progresso, Concluido)." },
    ],
  },
  {
    id: "convidar-membros",
    categoria: "workspaces",
    titulo: "Convidando membros",
    descricao: "Por email ou link compartilhavel",
    tags: ["convidar", "membros", "equipe", "link"],
    popular: true,
    conteudo: [
      { tipo: "titulo", conteudo: "Por email", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Abra seu workspace e va para a aba Ajustes",
        "Na secao Equipe, digite o email do membro",
        "Clique em 'Convidar'",
        "Se a pessoa ja tem conta, ela e adicionada automaticamente",
      ]},
      { tipo: "titulo", conteudo: "Por link", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Na mesma secao Equipe, clique em 'Gerar link de convite'",
        "Copie o link gerado",
        "Compartilhe (WhatsApp, Slack, email)",
        "A pessoa que receber pode acessar e entrar diretamente",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "Links de convite expiram em 7 dias. Qualquer pessoa com o link pode entrar — use com cautela." },
    ],
  },

  // ─────────────────────────────────────────────
  // SPRINTS
  // ─────────────────────────────────────────────
  {
    id: "o-que-sao-sprints",
    categoria: "sprints",
    titulo: "O que sao sprints",
    descricao: "Conceito agil e como funciona no TaskFlow",
    tags: ["sprint", "agil", "conceito"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "Sprints (chamadas tambem de quadros) sao ciclos de trabalho com inicio, fim e meta. No TaskFlow, cada sprint e um quadro Kanban com colunas customizaveis." },
      { tipo: "titulo", conteudo: "Estados de uma sprint", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Planejada — ainda nao comecou, voce esta organizando os cards",
        "Ativa — em andamento, time trabalhando nos cards",
        "Concluida — sprint encerrada, mostra retrospectiva",
      ]},
    ],
  },
  {
    id: "criar-sprint",
    categoria: "sprints",
    titulo: "Criando uma sprint",
    descricao: "Passo a passo com datas e meta",
    tags: ["criar", "sprint"],
    popular: true,
    conteudo: [
      { tipo: "passos", conteudo: [
        "Dentro de um workspace, clique em '+ Nova Sprint'",
        "Informe um nome (ex: 'Sprint 1 — Onboarding')",
        "Defina as datas de inicio e fim",
        "Escreva a meta da sprint (objetivo)",
        "Escolha uma cor",
        "Clique em 'Criar Sprint'",
      ]},
      { tipo: "alerta", variante: "tip", conteudo: "Sprints com datas habilitam o burndown chart e calculo de velocity automaticamente." },
    ],
  },
  {
    id: "colunas-kanban",
    categoria: "sprints",
    titulo: "Gerenciando colunas Kanban",
    descricao: "Adicionar, reordenar e renomear",
    tags: ["colunas", "kanban"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "As colunas representam os estados pelos quais um card passa (ex: A Fazer → Em Progresso → Em Review → Concluido). Voce pode customizar conforme seu fluxo." },
      { tipo: "titulo", conteudo: "Adicionar coluna", nivel: 2 },
      { tipo: "passos", conteudo: [
        "No quadro, clique no '+' apos a ultima coluna",
        "Digite o nome",
        "Pressione Enter",
      ]},
      { tipo: "titulo", conteudo: "Reordenar colunas", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Arraste o cabecalho de uma coluna para a esquerda ou direita." },
      { tipo: "titulo", conteudo: "Renomear ou excluir", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Clique nos 3 pontinhos (...) no cabecalho da coluna para acessar as opcoes." },
    ],
  },
  {
    id: "burndown-velocity",
    categoria: "sprints",
    titulo: "Burndown chart e velocity",
    descricao: "Acompanhe o progresso do sprint",
    tags: ["burndown", "velocity", "metricas"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "O burndown chart mostra quantos pontos restam em uma sprint ao longo do tempo. E a melhor forma de saber se a sprint vai terminar no prazo." },
      { tipo: "titulo", conteudo: "Como ler o burndown", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Linha tracejada (Ideal): trajetoria perfeita, todos os pontos completados uniformemente",
        "Linha solida (Real): pontos completados ate hoje",
        "Linha tracejada colorida (Trend): projecao baseada na velocity atual",
      ]},
      { tipo: "titulo", conteudo: "Velocity", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Velocity e a quantidade de pontos completados por dia. O TaskFlow calcula automaticamente e mostra a projecao de quando a sprint deve terminar." },
      { tipo: "alerta", variante: "info", conteudo: "Para ver o burndown, va na aba Metricas do workspace. Cards precisam ter pontos (peso) atribuidos." },
    ],
  },

  // ─────────────────────────────────────────────
  // CARDS
  // ─────────────────────────────────────────────
  {
    id: "criar-cards",
    categoria: "cards",
    titulo: "Criando cards",
    descricao: "Manualmente, com IA ou via importacao",
    tags: ["criar", "cards", "tarefa"],
    popular: true,
    conteudo: [
      { tipo: "titulo", conteudo: "Criar manualmente", nivel: 2 },
      { tipo: "passos", conteudo: [
        "No quadro, clique em '+ Nova tarefa' em qualquer coluna",
        "Digite o titulo",
        "Pressione Enter",
      ]},
      { tipo: "titulo", conteudo: "Criar com IA", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Clique no botao 'IA' no topo do quadro",
        "Descreva o que voce quer fazer em texto livre",
        "A IA gera multiplos cards automaticamente",
        "Revise e clique em 'Importar'",
      ]},
      { tipo: "titulo", conteudo: "Importar de outras ferramentas", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Veja os artigos sobre importacao do Trello e Jira." },
    ],
  },
  {
    id: "editar-cards",
    categoria: "cards",
    titulo: "Editando cards",
    descricao: "Titulo, descricao, peso, datas",
    tags: ["editar", "cards"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Clique em qualquer card para abrir o detalhe",
        "Clique no titulo ou descricao para editar inline",
        "Atribua peso (story points) usando os botoes de Fibonacci",
        "Defina data de entrega se houver prazo",
        "Adicione etiquetas, membros, checklists, comentarios",
        "Tudo e salvo automaticamente",
      ]},
    ],
  },
  {
    id: "checklists",
    categoria: "cards",
    titulo: "Checklists e subtarefas",
    descricao: "Quebre cards grandes em itens menores",
    tags: ["checklist", "subtarefa"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Abra um card",
        "Clique em '+ Adicionar checklist'",
        "Digite o nome do checklist (ex: 'Criterios de Aceitacao')",
        "Adicione itens (cada linha um item)",
        "Marque os concluidos clicando no checkbox",
      ]},
      { tipo: "alerta", variante: "tip", conteudo: "Voce pode ter multiplos checklists por card. Otimo para separar criterios de aceitacao, tarefas tecnicas, etc." },
    ],
  },
  {
    id: "comentarios-anexos",
    categoria: "cards",
    titulo: "Comentarios e anexos",
    descricao: "Discussoes e arquivos no card",
    tags: ["comentarios", "anexos"],
    conteudo: [
      { tipo: "titulo", conteudo: "Comentarios", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Use comentarios para discutir o card com a equipe. Suporta markdown basico (negrito, italico, links, listas)." },
      { tipo: "titulo", conteudo: "Anexos", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Arraste arquivos para o card ou clique em 'Adicionar anexo'. Imagens, PDFs, qualquer arquivo." },
    ],
  },
  {
    id: "etiquetas",
    categoria: "cards",
    titulo: "Etiquetas (labels)",
    descricao: "Organize cards por categoria",
    tags: ["etiquetas", "labels", "tags"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "Etiquetas sao tags coloridas para categorizar cards (ex: bug, feature, urgente, frontend, backend)." },
      { tipo: "passos", conteudo: [
        "Abra um card",
        "Clique em '+ Etiqueta'",
        "Selecione uma existente ou crie uma nova",
        "Cores ajudam a identificar visualmente no quadro",
      ]},
    ],
  },

  // ─────────────────────────────────────────────
  // GITHUB
  // ─────────────────────────────────────────────
  {
    id: "conectar-github",
    categoria: "github",
    titulo: "Conectando sua conta GitHub",
    descricao: "OAuth ou Personal Access Token (PAT)",
    tags: ["github", "conectar", "oauth"],
    popular: true,
    conteudo: [
      { tipo: "titulo", conteudo: "Via OAuth (recomendado)", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Va em Configuracoes (Settings)",
        "Na secao GitHub, clique em 'Conectar com GitHub'",
        "Autorize as permissoes solicitadas",
        "Voce sera redirecionado de volta ao TaskFlow",
      ]},
      { tipo: "titulo", conteudo: "Via Personal Access Token", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Crie um PAT no GitHub (Settings → Developer settings → Personal access tokens)",
        "Permissoes minimas: repo, read:user",
        "Cole o token na secao GitHub do TaskFlow",
        "Clique em 'Salvar'",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "OAuth e mais seguro pois nao requer copiar/colar tokens. Mas PAT funciona se sua organizacao bloqueia OAuth." },
    ],
  },
  {
    id: "vincular-repo",
    categoria: "github",
    titulo: "Vinculando repositorios",
    descricao: "Conecte um repo ao seu workspace",
    tags: ["github", "repositorio", "vincular"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Va para o workspace",
        "Clique em 'Repos' no menu",
        "Cole a URL do repo ou owner/nome",
        "Selecione e clique em 'Conectar'",
        "Defina colunas de mapeamento (Doing, Review, Done) se quiser automacoes",
      ]},
    ],
  },
  {
    id: "pull-requests",
    categoria: "github",
    titulo: "Pull Requests",
    descricao: "Criar e sincronizar PRs com cards",
    tags: ["pr", "pull request", "github"],
    conteudo: [
      { tipo: "titulo", conteudo: "Criar PR de um card", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Abra um card",
        "Clique em 'Iniciar trabalho' (cria branch automatico)",
        "Faca seus commits no branch",
        "Quando pronto, clique em 'Finalizar trabalho'",
        "PR e criado automaticamente, card vai para 'Em Review'",
      ]},
      { tipo: "titulo", conteudo: "Sincronizacao", nivel: 2 },
      { tipo: "paragrafo", conteudo: "Quando o PR e mergeado ou fechado no GitHub, o card e atualizado automaticamente via webhook (se configurado) ou sync manual." },
    ],
  },
  {
    id: "webhooks",
    categoria: "github",
    titulo: "Configurando webhooks",
    descricao: "Sincronizacao automatica de PRs",
    tags: ["webhook", "github"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Abra o repo no TaskFlow (aba Repos)",
        "Clique em 'Configurar webhook'",
        "Copie a URL gerada",
        "No GitHub, va em Settings → Webhooks → Add webhook",
        "Cole a URL e o secret",
        "Selecione 'Pull requests' como evento",
        "Salve",
      ]},
      { tipo: "alerta", variante: "success", conteudo: "Pronto! Toda mudanca em PR sera refletida no TaskFlow em segundos." },
    ],
  },

  // ─────────────────────────────────────────────
  // PLANNING POKER
  // ─────────────────────────────────────────────
  {
    id: "o-que-e-poker",
    categoria: "poker",
    titulo: "O que e Planning Poker",
    descricao: "Tecnica agil de estimativa em equipe",
    tags: ["poker", "estimativa", "agil"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "Planning Poker e uma tecnica colaborativa de estimativa onde cada membro vota o esforco de uma tarefa em pontos (geralmente Fibonacci: 1, 2, 3, 5, 8, 13)." },
      { tipo: "paragrafo", conteudo: "Todos votam ao mesmo tempo, evitando viesar a opiniao dos outros. Apos revelar, discute-se as diferencas e vota-se de novo ate consenso." },
      { tipo: "alerta", variante: "tip", conteudo: "TaskFlow tem Planning Poker integrado — nao precisa de ferramenta externa." },
    ],
  },
  {
    id: "iniciar-poker",
    categoria: "poker",
    titulo: "Iniciando uma sessao de Poker",
    descricao: "Como votar e revelar resultados",
    tags: ["poker", "iniciar", "votar"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Abra um card que precisa de estimativa",
        "Clique no botao 'Poker' no topo do workspace",
        "Selecione o card",
        "Clique em 'Iniciar sessao'",
        "Cada membro vota escolhendo um valor",
        "Quando todos votarem, clique em 'Revelar'",
        "Discuta as diferencas e revote se necessario",
        "Finalize escolhendo o valor consensual",
      ]},
    ],
  },

  // ─────────────────────────────────────────────
  // IA
  // ─────────────────────────────────────────────
  {
    id: "ia-gerar-cards",
    categoria: "ia",
    titulo: "Gerando cards com IA",
    descricao: "Crie multiplos cards a partir de texto livre",
    tags: ["ia", "gemini", "gerar"],
    popular: true,
    conteudo: [
      { tipo: "paragrafo", conteudo: "O TaskFlow usa o Google Gemini para transformar texto livre em cards estruturados." },
      { tipo: "passos", conteudo: [
        "Clique no botao 'IA' no topo do workspace",
        "Escreva o que precisa fazer (ex: 'Implementar sistema de login com email e google oauth, com tela de cadastro, recuperacao de senha e validacao de email')",
        "Clique em 'Gerar cards'",
        "A IA cria multiplos cards com titulo, descricao e checklists",
        "Revise, edite se necessario, e clique em 'Importar tudo'",
      ]},
      { tipo: "alerta", variante: "tip", conteudo: "Quanto mais detalhado o texto, melhores os cards gerados. Mencione tecnologias, prazos, dependencias." },
    ],
  },
  {
    id: "ia-melhorar-card",
    categoria: "ia",
    titulo: "Aprimorando cards existentes",
    descricao: "Use IA para melhorar a descricao",
    tags: ["ia", "melhorar"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Abra um card que tem descricao basica",
        "Clique em 'Melhorar com IA' (icone de varinha magica)",
        "A IA expande a descricao com criterios de aceitacao, riscos e tarefas tecnicas",
        "Revise e aceite ou edite",
      ]},
    ],
  },

  // ─────────────────────────────────────────────
  // IMPORT/EXPORT
  // ─────────────────────────────────────────────
  {
    id: "importar-trello",
    categoria: "import-export",
    titulo: "Importando do Trello",
    descricao: "Migre seus boards do Trello",
    tags: ["importar", "trello", "json"],
    popular: true,
    conteudo: [
      { tipo: "titulo", conteudo: "1. Exportar do Trello", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Abra o board no Trello",
        "Clique em 'Mostrar menu' (canto superior direito)",
        "Va em 'Mais' → 'Imprimir e Exportar' → 'Exportar como JSON'",
        "Salve o arquivo .json no seu computador",
      ]},
      { tipo: "titulo", conteudo: "2. Importar no TaskFlow", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Va para o workspace destino",
        "Clique em 'Importar' no topo",
        "Escolha 'Trello'",
        "Faca upload do arquivo JSON (ou arraste)",
        "Revise o preview (colunas, cards, etiquetas)",
        "Clique em 'Importar X cards'",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "Importa: lists → colunas, cards (titulo + descricao), labels → etiquetas, checklists com itens. Cards arquivados sao ignorados." },
    ],
  },
  {
    id: "importar-jira",
    categoria: "import-export",
    titulo: "Importando do Jira",
    descricao: "Migre suas issues do Jira",
    tags: ["importar", "jira", "csv"],
    conteudo: [
      { tipo: "titulo", conteudo: "1. Exportar do Jira", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Va para 'Filters' (Filtros) no Jira",
        "Crie ou abra um filtro com as issues que quer exportar",
        "Clique em 'Export' → 'CSV (todos os campos)'",
        "Salve o arquivo .csv",
      ]},
      { tipo: "titulo", conteudo: "2. Importar no TaskFlow", nivel: 2 },
      { tipo: "passos", conteudo: [
        "No workspace, clique em 'Importar'",
        "Escolha 'Jira'",
        "Faca upload do CSV",
        "Revise o preview",
        "Clique em 'Importar'",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "Importa: Summary → titulo, Description → descricao, Status → coluna, Priority + Labels → etiquetas, Story Points → peso." },
    ],
  },
  {
    id: "exportar-dados",
    categoria: "import-export",
    titulo: "Exportando dados",
    descricao: "CSV ou JSON para backup ou analise",
    tags: ["exportar", "csv", "json", "backup"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "No workspace, clique em 'Exportar' no topo",
        "Escolha o formato: CSV ou JSON",
        "O download comeca automaticamente",
      ]},
      { tipo: "titulo", conteudo: "O que e exportado", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Todos os cards do workspace (backlog + sprints)",
        "Titulo, descricao, coluna, sprint, peso, datas, status",
        "Link do PR (se houver)",
        "Data de criacao e conclusao",
      ]},
    ],
  },

  // ─────────────────────────────────────────────
  // CONFIGURACOES
  // ─────────────────────────────────────────────
  {
    id: "editar-perfil",
    categoria: "config",
    titulo: "Editando seu perfil",
    descricao: "Nome, email e avatar",
    tags: ["perfil", "configuracoes"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Va em Configuracoes (menu do perfil → Configuracoes)",
        "Na secao Perfil, clique em 'Editar perfil'",
        "Altere o nome",
        "Clique em 'Salvar'",
      ]},
      { tipo: "alerta", variante: "info", conteudo: "Email nao pode ser alterado pois e usado para autenticacao. Avatar vem do GitHub se voce conectou." },
    ],
  },
  {
    id: "preferencias-notif",
    categoria: "config",
    titulo: "Preferencias de notificacao",
    descricao: "Controle o que voce recebe",
    tags: ["notificacoes", "email"],
    conteudo: [
      { tipo: "passos", conteudo: [
        "Va em Configuracoes",
        "Role ate a secao Notificacoes",
        "Use os toggles para ativar/desativar:",
      ]},
      { tipo: "lista", conteudo: [
        "Email: convite de workspace",
        "Email: card atribuido a voce",
        "Email: resumo semanal",
        "In-app: todas as notificacoes",
      ]},
    ],
  },
  {
    id: "api-keys-mcp",
    categoria: "config",
    titulo: "API Keys e MCP",
    descricao: "Integre TaskFlow com Claude Code",
    tags: ["api", "mcp", "claude"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "MCP (Model Context Protocol) permite que o Claude Code controle seu TaskFlow diretamente — criar cards, listar sprints, mover tarefas, tudo via comandos no seu IDE." },
      { tipo: "titulo", conteudo: "Gerar API Key", nivel: 2 },
      { tipo: "passos", conteudo: [
        "Va em Configuracoes",
        "Na secao API Keys (MCP), clique em 'Gerar Key'",
        "Selecione o workspace",
        "Copie a key (so aparece uma vez!)",
        "Cole no seu ~/.claude/settings.json conforme template mostrado",
      ]},
      { tipo: "alerta", variante: "warning", conteudo: "Trate API keys como senhas. Nao compartilhe, nao commite no git." },
    ],
  },

  // ─────────────────────────────────────────────
  // ATALHOS
  // ─────────────────────────────────────────────
  {
    id: "atalhos-teclado",
    categoria: "atalhos",
    titulo: "Atalhos de teclado",
    descricao: "Use o TaskFlow mais rapido",
    tags: ["atalhos", "teclado", "shortcut"],
    popular: true,
    conteudo: [
      { tipo: "titulo", conteudo: "Globais", nivel: 2 },
      { tipo: "lista", conteudo: [
        "Ctrl+K (ou Cmd+K) — Busca global",
        "? — Abrir Central de Ajuda",
        "Esc — Fechar modal/dropdown",
      ]},
      { tipo: "titulo", conteudo: "Navegacao", nivel: 2 },
      { tipo: "lista", conteudo: [
        "↑ / ↓ — Navegar em listas",
        "Enter — Confirmar selecao",
        "Tab — Trocar de aba (na busca)",
      ]},
    ],
  },

  // ─────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────
  {
    id: "faq-plano",
    categoria: "faq",
    titulo: "TaskFlow e gratis?",
    descricao: "Modelo de pricing e planos futuros",
    tags: ["preco", "gratis", "beta"],
    popular: true,
    conteudo: [
      { tipo: "paragrafo", conteudo: "Sim! Durante o beta, todas as funcionalidades sao gratis. Sem limites artificiais, sem cartao de credito." },
      { tipo: "paragrafo", conteudo: "No futuro teremos planos pagos com features avancadas para times maiores. Quem entrar durante o beta tera beneficios exclusivos." },
    ],
  },
  {
    id: "faq-dados",
    categoria: "faq",
    titulo: "Meus dados estao seguros?",
    descricao: "Seguranca e LGPD",
    tags: ["seguranca", "lgpd", "dados"],
    conteudo: [
      { tipo: "lista", conteudo: [
        "HTTPS em todas as comunicacoes",
        "Senhas criptografadas (bcrypt)",
        "Row Level Security (RLS) no banco",
        "Isolamento total entre workspaces",
        "Tokens GitHub armazenados de forma segura",
        "Compatibilidade com LGPD",
      ]},
      { tipo: "paragrafo", conteudo: "Veja nossa Politica de Privacidade para detalhes." },
    ],
  },
  {
    id: "faq-export",
    categoria: "faq",
    titulo: "Posso exportar meus dados a qualquer momento?",
    descricao: "Sim! TaskFlow nao prende voce",
    tags: ["exportar", "lock-in"],
    conteudo: [
      { tipo: "paragrafo", conteudo: "Sim, qualquer hora. Va em qualquer workspace e clique em 'Exportar' no topo. Voce recebe CSV ou JSON com todos os seus cards, sprints, etiquetas e checklists." },
      { tipo: "alerta", variante: "tip", conteudo: "Acreditamos que seus dados sao seus. Se quiser sair, pode levar tudo embora." },
    ],
  },
];

// =============================================
// HELPERS
// =============================================

export function getArtigoById(id: string): HelpArticle | undefined {
  return ARTIGOS.find((a) => a.id === id);
}

export function getArtigosByCategoria(categoriaId: string): HelpArticle[] {
  return ARTIGOS.filter((a) => a.categoria === categoriaId);
}

export function getArtigosPopulares(): HelpArticle[] {
  return ARTIGOS.filter((a) => a.popular);
}

export function buscarArtigos(query: string): HelpArticle[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return ARTIGOS.filter((a) =>
    a.titulo.toLowerCase().includes(q) ||
    a.descricao.toLowerCase().includes(q) ||
    a.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function getCategoriaById(id: string): HelpCategoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
