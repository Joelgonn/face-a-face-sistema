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
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    icon: '🚀',
    description: 'Guia rápido para começar'
  },
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
    id: 'offline',
    title: 'Modo Offline',
    icon: '📡',
    description: 'Funcionamento sem internet'
  },
  {
    id: 'problemas',
    title: 'Problemas Comuns',
    icon: '⚠️',
    description: 'Soluções rápidas'
  },
  {
    id: 'boas-praticas',
    title: 'Boas Práticas',
    icon: '🩺',
    description: 'Procedimentos recomendados'
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: '📋',
    description: 'Relatórios e exportações'
  }
];

export const helpItems: HelpItem[] = [
  // ============================================================
  // 🚀 PRIMEIROS PASSOS
  // ============================================================
  {
    id: 'pp-1',
    question: 'Como entrar no sistema?',
    answer: 'Utilize seu e-mail e senha cadastrados na tela de Login. Caso ainda não possua acesso, solicite o Código Mestre à coordenação do encontro para realizar seu cadastro.',
    category: 'primeiros-passos',
    tags: ['login', 'acesso', 'senha', 'cadastro']
  },
  {
    id: 'pp-2',
    question: 'Como me cadastrar como novo Encontreiro?',
    answer: 'Na tela inicial de Login, clique no botão "Cadastro". Você precisará do Código Mestre (solicite à liderança do encontro). Digite o Código Mestre, seu E-mail e crie uma Senha com no mínimo 6 caracteres (letras e números). Clique em "Cadastrar Acesso" e depois faça o Login normalmente.',
    category: 'primeiros-passos',
    tags: ['cadastro', 'código mestre', 'encontreiro', 'primeiro acesso']
  },
  {
    id: 'pp-3',
    question: 'O que significam os indicadores Online, Offline e Pendente?',
    answer: 'Online (verde): tudo funcionando normalmente, conectado à internet. Pendente (amarelo): existem dados aguardando sincronização com o servidor. Offline (cinza): sem internet, mas você pode continuar trabalhando normalmente - nada será perdido.',
    category: 'primeiros-passos',
    tags: ['status', 'online', 'offline', 'pendente', 'indicadores']
  },

  // ============================================================
  // 📊 DASHBOARD
  // ============================================================
  {
    id: 'dash-1',
    question: 'Como navegar pelo dashboard?',
    answer: 'Use o menu lateral para acessar as diferentes seções. No mobile, toque no ícone de menu (☰) no canto superior esquerdo para abrir a navegação. Cada seção tem funções específicas para gerenciar o encontro.',
    category: 'dashboard',
    tags: ['navegação', 'menu', 'dashboard']
  },
  {
    id: 'dash-2',
    question: 'O que significam as cores de status dos remédios?',
    answer: 'Verde: medicação em dia, tudo certo. Amarelo: atenção, faltam menos de 30 minutos para a próxima dose. Vermelho: atrasado, a hora da medicação já passou. O sistema atualiza esses status automaticamente.',
    category: 'dashboard',
    tags: ['cores', 'status', 'medicação', 'alertas']
  },

  // ============================================================
  // 👥 ENCONTRISTAS
  // ============================================================
  {
    id: 'enc-1',
    question: 'Como adicionar um novo encontrista?',
    answer: 'Clique em "Novo" no dashboard. Preencha os campos obrigatórios: Nome, Responsável e Alergias (se houver). Clique em "Cadastrar". Se estiver offline, o cadastro será salvo localmente e sincronizado quando a internet voltar.',
    category: 'encontristas',
    tags: ['cadastro', 'novo', 'encontrista', 'participante']
  },
  {
    id: 'enc-2',
    question: 'Como funciona o check-in?',
    answer: 'Na lista principal, ao lado do nome de cada encontrista há um ícone de pessoa. Ícone Cinza significa Ausente (ainda não chegou). Ícone Verde significa Presente (já está no local). Clique no ícone para alterar o status. O registro offline será sincronizado posteriormente.',
    category: 'encontristas',
    tags: ['check-in', 'presença', 'status', 'ícone']
  },
  {
    id: 'enc-3',
    question: 'Como acessar a ficha médica completa do encontrista?',
    answer: 'Clique no NOME do encontrista na lista principal para abrir sua ficha completa. Lá você verá: Nome, Responsável, Observações e, em destaque VERMELHO, as ALERGIAS cadastradas (se houver).',
    category: 'encontristas',
    tags: ['ficha', 'perfil', 'alergias', 'dados']
  },

  // ============================================================
  // 💊 FARMÁCIA
  // ============================================================
  {
    id: 'med-1',
    question: 'Como adicionar uma medicação?',
    answer: 'Dentro da ficha do encontrista, vá até a seção "Medicações" e clique em "+ Novo" ou "+ Adicionar". Digite o Nome do Remédio (o sistema sugere autocompletar). Preencha a Dosagem (ex: 500mg), Horário da primeira dose (ex: 08:00) e a Posologia (ex: 8/8h para cada 8 horas). Salve e o sistema calculará os próximos horários automaticamente.',
    category: 'medicamentos',
    tags: ['adicionar', 'medicação', 'dosagem', 'posologia']
  },
  {
    id: 'med-2',
    question: 'Como administrar uma dose?',
    answer: 'Na ficha do encontrista, localize o remédio e clique em "Administrar" (ícone de check verde). Confirme o horário que você está dando o remédio e clique em "Confirmar". Seu nome ficará registrado no Histórico de administrações.',
    category: 'medicamentos',
    tags: ['administrar', 'dose', 'aplicar', 'horário']
  },
  {
    id: 'med-3',
    question: 'O que acontece quando existe conflito de alergia?',
    answer: 'Se você tentar adicionar ou administrar um remédio que tenha conflito com a alergia do paciente (ex: alergia a Dipirona e tentar dar Novalgina, ou alergia a AINES e tentar dar Ibuprofeno), uma TELA VERMELHA DE RISCO DE VIDA aparecerá. Leia o aviso com atenção! Se tiver certeza médica de que é seguro, você pode "Assumir o risco". Na dúvida, consulte o médico ou líder responsável.',
    category: 'medicamentos',
    tags: ['alergia', 'alerta', 'risco', 'conflito', 'segurança']
  },
  {
    id: 'med-4',
    question: 'Como corrigir uma administração incorreta?',
    answer: 'Se você marcou que deu um remédio sem querer, vá até a aba "Histórico" na ficha do encontrista, encontre o registro errado e clique na lixeira para apagar apenas aquela dose específica. O resto do histórico permanece intacto.',
    category: 'medicamentos',
    tags: ['corrigir', 'erro', 'histórico', 'apagar', 'dose']
  },
  {
    id: 'med-5',
    question: 'Posso ver o histórico de medicamentos?',
    answer: 'Sim! O histórico completo de medicamentos administrados fica disponível na aba "Histórico" dentro da ficha do encontrista. Você também pode acessar relatórios completos na seção "Relatórios" do menu.',
    category: 'medicamentos',
    tags: ['histórico', 'consulta', 'registro', 'doses']
  },

  // ============================================================
  // 📡 OFFLINE
  // ============================================================
  {
    id: 'off-1',
    question: 'O sistema funciona sem internet?',
    answer: 'Sim! O Face a Face foi projetado para funcionar offline. Todas as alterações são salvas localmente e sincronizadas automaticamente quando a conexão for restabelecida. Um indicador no topo mostra seu status de conexão.',
    category: 'offline',
    tags: ['offline', 'funcionamento', 'internet']
  },
  {
    id: 'off-2',
    question: 'O que acontece se a internet cair durante o uso?',
    answer: 'Nada será perdido! O sistema continuará funcionando normalmente. Todos os cadastros, check-ins e administrações de medicamentos ficam armazenados localmente e serão enviados automaticamente quando a internet voltar.',
    category: 'offline',
    tags: ['internet', 'cair', 'dados', 'recuperação']
  },
  {
    id: 'off-3',
    question: 'Posso continuar cadastrando participantes offline?',
    answer: 'Sim! Os cadastros ficam armazenados localmente no seu dispositivo. Quando a internet retornar, o sistema sincronizará automaticamente todos os dados com o servidor. Não feche o sistema após fazer cadastros offline - deixe a sincronização acontecer.',
    category: 'offline',
    tags: ['cadastro', 'offline', 'participantes', 'sincronização']
  },

  // ============================================================
  // ⚠️ PROBLEMAS COMUNS
  // ============================================================
  {
    id: 'prob-1',
    question: 'A sincronização não ocorreu. O que fazer?',
    answer: 'Verifique se você está online (indicador verde no topo). Se estiver online e ainda houver itens pendentes, clique no botão de sincronização (nuvem). Se o problema persistir, use "Recarregar Sistema" no menu. Em último caso, contate o suporte técnico.',
    category: 'problemas',
    tags: ['sincronização', 'falha', 'pendente', 'erro']
  },
  {
    id: 'prob-2',
    question: 'Posso recarregar o sistema sem perder dados?',
    answer: 'Sim! Use a opção "Recarregar Sistema" para atualizar a página mantendo seus dados. Se houver itens pendentes de sincronização, eles NÃO serão perdidos. O sistema também possui "Recarregar Dados" para atualizar apenas as informações do servidor.',
    category: 'problemas',
    tags: ['recarregar', 'atualizar', 'dados', 'sistema']
  },
  {
    id: 'prob-3',
    question: 'O que é o Modo Emergência?',
    answer: 'O Modo Emergência é uma funcionalidade para casos extremos, quando o sistema não está respondendo normalmente. Ele permite continuar operando com funcionalidades básicas. Só utilize se orientado pela coordenação ou suporte técnico.',
    category: 'problemas',
    tags: ['emergência', 'modo', 'falha', 'extremo']
  },

  // ============================================================
  // 🩺 BOAS PRÁTICAS
  // ============================================================
  {
    id: 'bp-1',
    question: 'Quais são as regras de ouro para uso do sistema?',
    answer: 'Leia sempre as mensagens na tela. Se estiver offline, continue usando normalmente - nada será perdido. Sempre que possível, sincronize os dados. Em caso de dúvida, recarregue o sistema. Não clique várias vezes seguidas no mesmo botão.',
    category: 'boas-praticas',
    tags: ['regras', 'ouro', 'cuidados', 'boas práticas']
  },
  {
    id: 'bp-2',
    question: 'O que NÃO fazer no sistema?',
    answer: 'Não clique várias vezes seguidas no mesmo botão (pode gerar duplicidade). Não limpe a fila de sincronização sem saber o que está fazendo. Não feche o sistema imediatamente após fazer cadastros offline - aguarde a sincronização.',
    category: 'boas-praticas',
    tags: ['não fazer', 'cuidados', 'erros', 'evitar']
  },

  // ============================================================
  // 📋 RELATÓRIOS
  // ============================================================
  {
    id: 'rel-1',
    question: 'Como gerar relatórios de medicação?',
    answer: 'Na seção "Relatórios" do menu, você encontra o relatório completo de todas as doses aplicadas no evento, com data, hora, paciente, remédio e nome do Encontreiro que aplicou. É possível imprimir (formato limpo para PDF/Papel) ou baixar em CSV para abrir no Excel.',
    category: 'relatorios',
    tags: ['relatório', 'exportação', 'impressão', 'csv', 'excel']
  }
];