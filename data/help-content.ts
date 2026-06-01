export interface HelpItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    description: 'Visão geral e navegação principal'
  },
  {
    id: 'encontristas',
    title: 'Encontristas',
    icon: '👥',
    description: 'Gerenciamento de participantes'
  },
  {
    id: 'medicamentos',
    title: 'Farmácia',
    icon: '💊',
    description: 'Controle de medicamentos'
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: '📋',
    description: 'Relatórios e exportações'
  },
  {
    id: 'offline',
    title: 'Modo Offline',
    icon: '📡',
    description: 'Funcionamento sem internet'
  },
  {
    id: 'boas-praticas',
    title: 'Boas Práticas',
    icon: '🩺',
    description: 'Procedimentos recomendados'
  }
];

export const helpItems: HelpItem[] = [
  {
    id: 'dash-1',
    question: 'Como navegar pelo dashboard?',
    answer: 'Use o menu lateral para acessar as diferentes seções. No mobile, toque no ícone de menu (☰) no canto superior esquerdo para abrir a navegação. Cada seção tem funções específicas para gerenciar o encontro.',
    category: 'dashboard',
    tags: ['navegação', 'menu', 'dashboard']
  },
  {
    id: 'dash-2',
    question: 'O que significa o modo leitura?',
    answer: 'O modo leitura é ativado automaticamente quando você está offline e não tem uma sessão válida. Nele, você pode visualizar os dados mas não pode fazer alterações. Reconecte-se à internet e clique em "Reconectar" para voltar ao modo normal.',
    category: 'dashboard',
    tags: ['offline', 'modo leitura', 'sincronização']
  },
  {
    id: 'enc-1',
    question: 'Como adicionar um novo encontrista?',
    answer: 'Na página "Equipe", clique no botão "Novo Encontrista". Preencha os dados obrigatórios (nome, documento, contato) e clique em "Salvar". O cadastro será sincronizado automaticamente quando houver conexão.',
    category: 'encontristas',
    tags: ['cadastro', 'novo', 'encontrista']
  },
  {
    id: 'enc-2',
    question: 'Como funciona o check-in?',
    answer: 'O check-in pode ser feito escaneando o QR code do encontrista ou buscando pelo nome/documento. O sistema funciona online e offline, sincronizando os dados automaticamente quando a conexão for restabelecida.',
    category: 'encontristas',
    tags: ['check-in', 'QR code', 'presença']
  },
  {
    id: 'med-1',
    question: 'Como registrar uma medicação?',
    answer: 'Na seção "Farmácia", você pode registrar medicamentos administrados durante o encontro. Selecione o encontrista, adicione o medicamento, dosagem e horário. O registro fica disponível para consulta nos relatórios.',
    category: 'medicamentos',
    tags: ['registro', 'medicação', 'farmácia']
  },
  {
    id: 'med-2',
    question: 'Posso ver o histórico de medicamentos?',
    answer: 'Sim! O histórico completo de medicamentos administrados fica disponível nos relatórios. Você pode filtrar por encontrista, período ou medicamento específico.',
    category: 'medicamentos',
    tags: ['histórico', 'consulta', 'relatório']
  },
  {
    id: 'rel-1',
    question: 'Como gerar relatórios?',
    answer: 'Na seção "Relatórios", escolha o tipo de relatório desejado (encontristas, medicamentos, presença). Você pode filtrar por período e exportar em diferentes formatos quando estiver online.',
    category: 'relatorios',
    tags: ['exportação', 'dados', 'impressão']
  },
  {
    id: 'off-1',
    question: 'O sistema funciona sem internet?',
    answer: 'Sim! O Face a Face foi projetado para funcionar offline. Todas as alterações são salvas localmente e sincronizadas automaticamente quando a conexão for restabelecida. Um indicador no topo mostra seu status de conexão.',
    category: 'offline',
    tags: ['offline', 'sincronização', 'dados locais']
  },
  {
    id: 'off-2',
    question: 'Meus dados estão seguros offline?',
    answer: 'Sim! Os dados são armazenados localmente de forma segura usando IndexedDB e localStorage do navegador. Apenas usuários autenticados têm acesso, mesmo offline. Quando online, os dados são sincronizados com o servidor.',
    category: 'offline',
    tags: ['segurança', 'dados', 'armazenamento']
  }
];