/**
 * Arquivo: src/lib/copy.ts
 * Propósito: Strings de interface centralizadas com voz Axiomix.
 *
 * Tom: parceiro esperto que fala a língua do empresário brasileiro.
 * Regras:
 *  - Max 12 palavras em mensagens de interface (exceto empty states)
 *  - Sem "gerenciar", "visualizar", "solução" — use "ver", "criar", "mandar"
 *  - Fale o resultado, não a funcionalidade
 *  - "Você" sempre, "Usuário" nunca
 *  - Erros honestos e com direção
 */

export const COPY = {
  dashboard: {
    title: 'Visão Geral',
    emptyTitle: 'Seus números vão aparecer aqui',
    emptyDescription:
      'Conforme você usa o Axiomix, seus KPIs ganham vida — ao vivo.',
    emptyTip: 'Volte amanhã e esse painel vai estar vivo.',
    emptyAction: 'Criar primeira campanha',
  },

  whatsapp: {
    title: 'WhatsApp',
    emptyTitle: 'Silêncio por aqui...',
    emptyDescription:
      'Seus contatos estão esperando. Configure seu primeiro template e comece a conversar.',
    emptyTip: 'Templates com emoji no início têm 23% mais abertura.',
    emptyAction: 'Criar template',
    connectionEmpty: 'Conecte seu WhatsApp em 2 minutos',
    connected: 'Conectado',
    syncing: 'Sincronizando...',
  },

  social: {
    title: 'Publicações',
    emptyTitle: 'Seu estúdio de conteúdo tá pronto.',
    emptyDescription:
      'Aqui você cria, agenda e acompanha seus posts. Tudo num lugar só.',
    emptyTip:
      'Que tal começar com um post simples? Uma foto do seu produto favorito já é um ótimo início.',
    emptyAction: 'Criar primeiro post',
    contextualActive: (n: number) =>
      `${n} ${n === 1 ? 'post pronto' : 'posts prontos'} pra essa semana. Tá no ritmo.`,
    contextualInactive: (days: number) =>
      `Faz ${days} ${days === 1 ? 'dia' : 'dias'} que você não publica. Bora voltar?`,
  },

  campaigns: {
    title: 'Campanhas',
    emptyTitle: 'Nenhuma campanha no radar',
    emptyDescription:
      'Crie sua primeira campanha e veja seus números decolarem. A gente guia cada passo.',
    emptyTip: 'Sua primeira campanha leva menos de 5 minutos.',
    emptyAction: 'Criar campanha',
    sendingToast: 'Mensagens a caminho! Você pode acompanhar aqui.',
    errorToast:
      'Eita, algo deu errado no envio. Tenta de novo — se repetir, fala com a gente.',
    deleteConfirm: (name: string) =>
      `Excluir "${name}"? Essa ação não pode ser desfeita.`,
  },

  knowledge: {
    title: 'Base de Conhecimento',
    emptyTitle: 'Sua base de conhecimento começa aqui',
    emptyDescription:
      'Suba documentos e o Axiomix aprende sobre o seu negócio.',
    emptyTip: 'PDFs, DOCs e TXTs são aceitos.',
    emptyAction: 'Subir documento',
  },

  intelligence: {
    title: 'Intelligence',
    emptyTitle: 'Seus insights estão a caminho',
    emptyDescription:
      'Conforme os dados entram, a gente descobre padrões e oportunidades pra você.',
    emptyAction: 'Explorar',
  },

  common: {
    save: 'Salvar',
    saved: 'Pronto, salvo.',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    genericError:
      'Algo deu errado do nosso lado. Tenta de novo em 1 minuto.',
    genericEmpty: 'Nada aqui ainda — mas é só começar',
    confirm: 'Confirmar',
    back: 'Voltar',
    next: 'Próximo',
    search: 'Buscar...',
    noResults: 'Nenhum resultado encontrado',
    tryAgain: 'Tentar de novo',
  },

  errors: {
    network: 'Parece que a internet oscilou. Tentando de novo...',
    timeout:
      'Tá demorando mais que o normal. Pode ser o volume de dados — segura firme.',
    notFound: 'Essa página não existe — ou foi embora sem avisar',
    serverError: 'Eita, algo saiu do trilho. A gente já tá olhando.',
  },
} as const;
