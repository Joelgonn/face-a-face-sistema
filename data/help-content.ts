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

export const HELP_VERSION = {
  version: '2.0.0',
  updatedAt: '2026-06-01'
};

export const helpCategories: HelpCategory[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    icon: '🚀',
    description: 'Login, acesso e primeiras orientações'
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    description: 'Visão geral e indicadores do encontro'
  },
  {
    id: 'conectividade',
    title: 'Conectividade e Offline',
    icon: '📡',
    description: 'Sincronização, status de conexão e modo offline'
  },
  {
    id: 'encontristas',
    title: 'Encontristas',
    icon: '👥',
    description: 'Gerenciamento de participantes'
  },
  {
    id: 'medicacoes-operacionais',
    title: 'Administração de Medicações',
    icon: '💉',
    description: 'Prescrições, doses e histórico de administrações'
  },
  {
    id: 'base-medicamentos',
    title: 'Base de Medicamentos',
    icon: '💊',
    description: 'Catálogo de referência para prescrições'
  },
  {
    id: 'equipe',
    title: 'Gestão de Equipe',
    icon: '👥',
    description: 'Administração de usuários e permissões'
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: '📋',
    description: 'Consultas, exportação e impressão'
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    icon: '🛡️',
    description: 'Proteção, riscos e boas práticas'
  },
  {
    id: 'problemas',
    title: 'Problemas Comuns',
    icon: '⚠️',
    description: 'Soluções rápidas para situações frequentes'
  },
  {
    id: 'boas-praticas',
    title: 'Boas Práticas',
    icon: '✅',
    description: 'Procedimentos recomendados para a equipe'
  }
];

export const helpItems: HelpItem[] = [
  // ============================================================
  // 🚀 PRIMEIROS PASSOS
  // ============================================================
  {
    id: 'pp-1',
    question: 'Como acessar o sistema?',
    answer: 'Informe seu e-mail e senha cadastrados na tela de Login. Após a autenticação você será direcionado para o Dashboard. Caso ainda não possua acesso, solicite o Código Mestre à coordenação do encontro para realizar seu cadastro.',
    category: 'primeiros-passos',
    tags: ['login', 'acesso', 'senha', 'autenticação']
  },
  {
    id: 'pp-2',
    question: 'Como me cadastrar como novo Encontreiro?',
    answer: 'Na tela inicial de Login, clique em "Cadastro". Você precisará do Código Mestre fornecido pela coordenação do encontro. Digite o Código Mestre, seu e-mail e crie uma senha com no mínimo 6 caracteres. Após concluir o cadastro, realize o login normalmente.',
    category: 'primeiros-passos',
    tags: ['cadastro', 'código mestre', 'encontreiro', 'primeiro acesso']
  },
  {
    id: 'pp-3',
    question: 'O que fazer se o login falhar?',
    answer: 'Verifique o e-mail informado, a senha digitada e sua conexão com a internet. Caso o problema persista, procure a coordenação do encontro para verificar se seu acesso está ativo na Gestão de Equipe.',
    category: 'primeiros-passos',
    tags: ['login', 'falha', 'erro', 'acesso']
  },
  {
    id: 'pp-4',
    question: 'Como navegar pelo sistema?',
    answer: 'Utilize o menu lateral para acessar as áreas principais: Dashboard, Equipe, Relatórios, Farmácia e Ajuda. No celular, toque no ícone de menu (☰) no canto superior esquerdo. Para voltar à tela anterior, use o botão de voltar no topo da tela.',
    category: 'primeiros-passos',
    tags: ['navegação', 'menu', 'mobile', 'áreas']
  },
  {
    id: 'pp-5',
    question: 'O que é o botão "Instalar App"?',
    answer: 'Essa opção instala o Face a Face diretamente no seu dispositivo como um aplicativo. As vantagens incluem: acesso mais rápido, melhor funcionamento offline, ícone próprio no dispositivo e experiência semelhante a aplicativos nativos.',
    category: 'primeiros-passos',
    tags: ['instalar', 'app', 'aplicativo', 'pwa']
  },
  {
    id: 'pp-6',
    question: 'Onde procurar ajuda quando estiver em dúvida?',
    answer: 'Utilize a Central de Ajuda para consultar procedimentos, dúvidas operacionais e boas práticas. Caso não encontre a informação desejada, procure a coordenação do encontro.',
    category: 'primeiros-passos',
    tags: ['ajuda', 'dúvida', 'suporte', 'central', 'coordenação']
  },

  // ============================================================
  // 📊 DASHBOARD
  // ============================================================
  {
    id: 'dash-1',
    question: 'O que significam os indicadores no topo da tela?',
    answer: 'Os indicadores mostram um resumo rápido da situação atual do encontro. Inscritos: quantidade total de encontristas cadastrados. Presentes: encontristas que realizaram check-in. Ausentes: encontristas que ainda não realizaram check-in. Os números são atualizados automaticamente conforme os registros são alterados.',
    category: 'dashboard',
    tags: ['indicadores', 'inscritos', 'presentes', 'ausentes', 'contadores']
  },
  {
    id: 'dash-2',
    question: 'Como pesquisar um encontrista?',
    answer: 'Utilize a barra de pesquisa localizada na parte superior da tela. Você pode pesquisar por nome do encontrista, nome do responsável ou número de identificação (ID). Os resultados são atualizados automaticamente enquanto você digita.',
    category: 'dashboard',
    tags: ['pesquisa', 'busca', 'encontrista', 'filtro', 'localizar']
  },
  {
    id: 'dash-3',
    question: 'Quando devo utilizar "Recarregar Dados" ou "Recarregar Sistema"?',
    answer: 'Recarregar Dados: para atualizar as informações exibidas com os dados mais recentes do servidor. Recarregar Sistema: apenas quando o sistema apresentar comportamento inesperado - recarrega completamente a aplicação. Para sincronização, veja a seção Conectividade e Offline.',
    category: 'dashboard',
    tags: ['recarregar', 'dados', 'sistema', 'atualizar']
  },
  {
    id: 'dash-4',
    question: 'O que é a função "Zerar Sistema"?',
    answer: 'A função "Zerar Sistema" remove permanentemente os dados operacionais do encontro e deve ser utilizada apenas pela coordenação responsável. Por segurança, a operação exige uma credencial administrativa exclusiva. Essa ação é irreversível e só deve ser executada após autorização formal da liderança do encontro.',
    category: 'dashboard',
    tags: ['zerar', 'reset', 'limpar', 'administrativo', 'irreversível', 'permanente']
  },

  // ============================================================
  // 📡 CONECTIVIDADE E OFFLINE
  // ============================================================
  {
    id: 'conn-1',
    question: 'O que significam os status Online, Pendente e Offline?',
    answer: 'Online (verde): conectado à internet, tudo funcionando e sincronizando normalmente. Pendente (amarelo): existem dados aguardando sincronização - os dados estão seguros e serão enviados automaticamente. Offline (cinza): sem internet, mas você pode continuar trabalhando normalmente - o sistema salva tudo localmente.',
    category: 'conectividade',
    tags: ['online', 'pendente', 'offline', 'status', 'indicadores', 'conexão']
  },
  {
    id: 'conn-2',
    question: 'O sistema funciona sem internet?',
    answer: 'Sim! O Face a Face foi projetado para funcionar offline. Grande parte das funcionalidades continua disponível mesmo durante falhas de conexão. Todos os dados são armazenados localmente no dispositivo e sincronizados automaticamente quando a internet retornar.',
    category: 'conectividade',
    tags: ['offline', 'funcionamento', 'internet', 'local', 'sem conexão']
  },
  {
    id: 'conn-3',
    question: 'O que é a tela de Pendências Offline?',
    answer: 'A tela de Pendências Offline exibe registros que ainda não foram sincronizados com o servidor. Ela permite acompanhar o que está aguardando envio. Você pode usar "Sincronizar" para forçar o envio imediato ou "Limpar" com cuidado. Acesse clicando no ícone de nuvem.',
    category: 'conectividade',
    tags: ['pendências', 'fila', 'envio', 'sincronização', 'nuvem']
  },
  {
    id: 'conn-4',
    question: 'Como e quando sincronizar os dados?',
    answer: 'A sincronização ocorre automaticamente quando a conexão retorna. Se desejar forçar o envio imediato, use o botão "Sincronizar". Use "Reconectar" para uma nova verificação de conectividade e autenticação. Nunca refaça registros já realizados offline - aguarde a sincronização.',
    category: 'conectividade',
    tags: ['sincronizar', 'reconectar', 'automático', 'forçar', 'envio']
  },
  {
    id: 'conn-5',
    question: 'O que é o Modo Leitura e o Modo Offline Limitado?',
    answer: 'Modo Leitura: ativado quando você está offline sem sessão totalmente validada - permite consulta, mas algumas alterações ficam indisponíveis. Para sair, reconecte-se à internet e use "Reconectar". Modo Offline Limitado: permite continuar usando funcionalidades offline, com algumas operações temporariamente restringidas.',
    category: 'conectividade',
    tags: ['modo leitura', 'limitado', 'consulta', 'restrição', 'sessão']
  },
  {
    id: 'conn-6',
    question: 'O que fazer quando a internet cair ou retornar?',
    answer: 'Quando cair: continue trabalhando normalmente - nada será perdido. Quando retornar: o sistema detecta automaticamente e processa as sincronizações pendentes. Verifique periodicamente o indicador de status no topo da tela. Confirme a ausência de pendências antes de encerrar suas atividades.',
    category: 'conectividade',
    tags: ['internet', 'cair', 'retornar', 'recuperação', 'continuar']
  },

  // ============================================================
  // 👥 ENCONTRISTAS
  // ============================================================
  {
    id: 'enc-1',
    question: 'O que é a tela do Encontrista?',
    answer: 'A tela do Encontrista reúne todas as informações importantes de um participante. Nela você pode consultar dados pessoais, visualizar alergias e observações em destaque, acessar a seção de medicações e consultar o histórico completo de administrações.',
    category: 'encontristas',
    tags: ['ficha', 'perfil', 'informações', 'participante', 'dados']
  },
  {
    id: 'enc-2',
    question: 'Como funciona o check-in e os status de presença?',
    answer: 'Na lista principal, ao lado do nome de cada encontrista há um ícone de pessoa. Ícone Cinza: Ausente (ainda não realizou check-in). Ícone Verde: Presente (já realizou check-in). Clique no ícone para alterar o status. O registro offline será sincronizado posteriormente.',
    category: 'encontristas',
    tags: ['check-in', 'presença', 'ausente', 'presente', 'status', 'ícone']
  },
  {
    id: 'enc-3',
    question: 'Como editar os dados de um encontrista?',
    answer: 'Clique no ícone de edição localizado no topo da tela do encontrista. É possível atualizar nome, responsável, alergias e observações. As alterações serão salvas automaticamente após confirmação. Mantenha as informações sempre atualizadas.',
    category: 'encontristas',
    tags: ['editar', 'dados', 'alergias', 'observações', 'atualizar']
  },

  // ============================================================
  // 💉 ADMINISTRAÇÃO DE MEDICAÇÕES
  // ============================================================
  {
    id: 'med-op-1',
    question: 'Como cadastrar uma nova medicação?',
    answer: 'Na seção "Medicações" da tela do encontrista, clique em "Adicionar". Informe o nome do medicamento (o sistema sugere autocompletar), dosagem (ex: 500mg), posologia (ex: 8/8h para cada 8 horas) e horário inicial. Após salvar, a medicação ficará disponível para administração e o sistema calculará os próximos horários automaticamente.',
    category: 'medicacoes-operacionais',
    tags: ['cadastrar', 'medicação', 'dosagem', 'posologia', 'horário']
  },
  {
    id: 'med-op-2',
    question: 'O que é dosagem, posologia e horário inicial?',
    answer: 'Dosagem: quantidade a ser administrada (ex: 500mg, 1 comprimido, 10ml). Posologia: frequência de administração (ex: a cada 6 horas, 8/8h, uma vez ao dia) - usada pelo sistema para acompanhar os horários previstos. Horário inicial: primeiro horário programado. Sempre confira a prescrição antes do registro.',
    category: 'medicacoes-operacionais',
    tags: ['dosagem', 'posologia', 'horário', 'prescrição', 'frequência']
  },
  {
    id: 'med-op-3',
    question: 'Como administrar uma medicação?',
    answer: 'Clique no botão "Administrar" ao lado da medicação desejada. Confirme o horário informado e finalize a operação. O sistema registrará automaticamente: horário da administração, responsável pela ação e atualização do histórico do participante.',
    category: 'medicacoes-operacionais',
    tags: ['administrar', 'dose', 'aplicar', 'registro', 'confirmar']
  },
  {
    id: 'med-op-4',
    question: 'O que significam os status das medicações?',
    answer: 'Em dia (verde): medicamento administrado corretamente dentro do período esperado. Atenção (amarelo): próximo do horário previsto (menos de 30 minutos) - acompanhe para evitar atrasos. Atrasado (vermelho): deveria ter sido administrado e ainda não possui registro recente - exige atenção imediata. Sem dados: medicação recém-cadastrada, sem informações suficientes para determinar status.',
    category: 'medicacoes-operacionais',
    tags: ['status', 'em dia', 'atrasado', 'atenção', 'cores', 'alerta']
  },
  {
    id: 'med-op-5',
    question: 'Como funciona o Histórico de Administração?',
    answer: 'O histórico registra todas as administrações realizadas para o participante. Cada registro apresenta: medicamento administrado, dosagem, data, horário e responsável. É possível consultar administrações anteriores a qualquer momento, identificar quem administrou cada dose e excluir registros específicos quando necessário para correção.',
    category: 'medicacoes-operacionais',
    tags: ['histórico', 'registro', 'consulta', 'rastreabilidade', 'doses']
  },
  {
    id: 'med-op-6',
    question: 'Como corrigir uma administração incorreta?',
    answer: 'Se você registrou uma administração por engano, vá até a aba "Histórico" na tela do encontrista, localize o registro errado e utilize o ícone de exclusão para apagar apenas aquela dose específica. O restante do histórico permanece intacto. Esta ação deve ser realizada apenas quando houver real necessidade de correção.',
    category: 'medicacoes-operacionais',
    tags: ['corrigir', 'erro', 'histórico', 'excluir', 'dose', 'apagar']
  },
  {
    id: 'med-op-7',
    question: 'O que acontece com medicações e administrações em modo offline?',
    answer: 'Medicações cadastradas offline aparecem como "Pendente (offline)". Administrações realizadas offline aparecem como "Administrado (pendente sync)". Ambos os registros são válidos e serão sincronizados automaticamente quando a conexão retornar. Você pode continuar trabalhando normalmente.',
    category: 'medicacoes-operacionais',
    tags: ['offline', 'pendente', 'sync', 'administração', 'sincronização']
  },

  // ============================================================
  // 💊 BASE DE MEDICAMENTOS
  // ============================================================
  {
    id: 'base-1',
    question: 'O que é e para que serve a Base de Medicamentos?',
    answer: 'A Base de Medicamentos é o cadastro central que o sistema utiliza para sugerir medicamentos durante o registro de prescrições. Ela serve para padronizar nomes, reduzir erros de digitação, acelerar o cadastro e melhorar a qualidade dos relatórios.',
    category: 'base-medicamentos',
    tags: ['base', 'catálogo', 'referência', 'sugestão', 'padronização']
  },
  {
    id: 'base-2',
    question: 'Como adicionar, editar ou excluir um medicamento?',
    answer: 'Para adicionar: clique em "Novo Medicamento" e informe o nome. Para editar: localize o medicamento e use a opção de edição - o novo nome será usado nas próximas prescrições. Para excluir: use a opção de exclusão e confirme - o medicamento sai das sugestões futuras, mas os registros históricos permanecem preservados.',
    category: 'base-medicamentos',
    tags: ['adicionar', 'editar', 'excluir', 'gerenciar', 'cadastrar']
  },
  {
    id: 'base-3',
    question: 'O sistema permite medicamentos duplicados?',
    answer: 'Não. O sistema verifica automaticamente e bloqueia cadastros duplicados. Se tentar cadastrar um medicamento que já existe, receberá um aviso. A duplicidade poderia gerar confusão durante os cadastros, relatórios inconsistentes e dificuldade de pesquisa.',
    category: 'base-medicamentos',
    tags: ['duplicado', 'bloqueio', 'existente', 'aviso', 'consistência']
  },
  {
    id: 'base-4',
    question: 'Qual nome utilizar e posso cadastrar medicamentos genéricos ou manipulados?',
    answer: 'Utilize preferencialmente o nome mais conhecido pela equipe, mantendo sempre o mesmo padrão de nomenclatura. Evite abreviações desnecessárias. Sim, o sistema aceita qualquer medicamento utilizado pela equipe, incluindo genéricos e manipulados. Cadastre apenas medicamentos realmente utilizados.',
    category: 'base-medicamentos',
    tags: ['nomenclatura', 'genérico', 'manipulado', 'padrão', 'nome']
  },

  // ============================================================
  // 👥 GESTÃO DE EQUIPE
  // ============================================================
  {
    id: 'equipe-1',
    question: 'O que é a Gestão de Equipe e quem pode acessá-la?',
    answer: 'A Gestão de Equipe permite administrar os usuários que possuem acesso ao sistema. Apenas usuários com permissões administrativas (coordenação) possuem acesso. Nessa tela é possível visualizar, pausar, liberar e excluir usuários, além de identificar a conta Master.',
    category: 'equipe',
    tags: ['gestão', 'equipe', 'admin', 'permissões', 'coordenação']
  },
  {
    id: 'equipe-2',
    question: 'Qual a diferença entre Pausar e Excluir um usuário?',
    answer: 'Pausar: suspende o acesso temporariamente - o cadastro permanece e pode ser restaurado a qualquer momento com "Liberar Acesso". Excluir: remove definitivamente o acesso - é necessário digitar DELETAR para confirmar (proteção contra exclusões acidentais). Use pausa quando houver possibilidade de retorno; exclusão apenas quando for definitivo.',
    category: 'equipe',
    tags: ['pausar', 'excluir', 'liberar', 'acesso', 'temporário', 'definitivo']
  },
  {
    id: 'equipe-3',
    question: 'O que é a Conta Master?',
    answer: 'A Conta Master é a principal conta administrativa do sistema, identificada como "Você (Admin)". Ela possui privilégios especiais e, por segurança, não pode ser pausada nem gerenciada pela própria tela de Gestão de Equipe - isso evita bloqueios acidentais do administrador principal.',
    category: 'equipe',
    tags: ['master', 'admin', 'principal', 'proteção', 'privilégios']
  },
  {
    id: 'equipe-4',
    question: 'Como resolver problemas de acesso de usuários?',
    answer: 'Se um usuário não conseguir acessar, verifique na Gestão de Equipe: se o status está Ativo (não Pausado), se o e-mail está correto e se o cadastro existe. Para restaurar acesso pausado, use "Liberar Acesso". Cada cartão de usuário mostra e-mail, status, data de criação e último acesso.',
    category: 'equipe',
    tags: ['acesso', 'problema', 'status', 'ativo', 'pausado', 'liberar']
  },

  // ============================================================
  // 📋 RELATÓRIOS
  // ============================================================
  {
    id: 'rel-1',
    question: 'O que é a tela de Relatórios e quais informações apresenta?',
    answer: 'A tela de Relatórios permite consultar todas as administrações de medicamentos realizadas durante o encontro, em ordem cronológica. Cada registro apresenta: data, horário, nome do participante, medicamento administrado, dosagem e responsável pela administração.',
    category: 'relatorios',
    tags: ['relatório', 'consulta', 'registros', 'administrações', 'cronológico']
  },
  {
    id: 'rel-2',
    question: 'Como pesquisar e filtrar registros?',
    answer: 'Utilize o campo de busca para pesquisar por nome do participante, medicamento ou administrador. Use o filtro de data para visualizar registros de um período específico. Os resultados são atualizados automaticamente conforme você digita ou seleciona.',
    category: 'relatorios',
    tags: ['pesquisa', 'filtro', 'data', 'busca', 'período']
  },
  {
    id: 'rel-3',
    question: 'O que significam os indicadores da Visão Geral?',
    answer: 'Total de Doses: quantidade total de administrações registradas no sistema. Doses Hoje: administrações realizadas no dia atual. Pacientes: número de participantes que possuem registros no relatório. Esses indicadores ajudam a acompanhar o andamento das atividades do encontro.',
    category: 'relatorios',
    tags: ['visão geral', 'indicadores', 'doses', 'pacientes', 'total']
  },
  {
    id: 'rel-4',
    question: 'Como exportar e imprimir relatórios?',
    answer: 'Utilize "Salvar CSV" para gerar um arquivo que pode ser aberto no Excel ou LibreOffice - ideal para auditoria, arquivamento, compartilhamento com a coordenação e análise posterior. Utilize "Imprimir" para uma versão formatada para impressão. O relatório é uma área de consulta - alterações devem ser feitas nas áreas apropriadas.',
    category: 'relatorios',
    tags: ['exportar', 'csv', 'imprimir', 'excel', 'arquivo']
  },

  // ============================================================
  // 🛡️ SEGURANÇA
  // ============================================================
  {
    id: 'seg-1',
    question: 'O que acontece quando existe conflito de alergia?',
    answer: 'Se você tentar adicionar ou administrar um medicamento que tenha conflito com alergias cadastradas do participante (ex: alergia a Dipirona e tentar dar Novalgina, ou alergia a AINES e tentar dar Ibuprofeno), uma TELA VERMELHA DE RISCO DE VIDA aparecerá. Leia o aviso com atenção! Se tiver certeza médica de que é seguro, você pode "Assumir o risco". Na dúvida, consulte o médico ou líder responsável.',
    category: 'seguranca',
    tags: ['alergia', 'alerta', 'risco de vida', 'conflito', 'vermelho', 'segurança']
  },
  {
    id: 'seg-2',
    question: 'O que é o Modo Emergência e quando utilizá-lo?',
    answer: 'O Modo Emergência bloqueia determinadas ações do sistema para evitar alterações acidentais durante situações críticas. É um recurso para casos extremos quando o sistema não está respondendo normalmente. Utilize apenas quando orientado pela coordenação.',
    category: 'seguranca',
    tags: ['emergência', 'crítico', 'bloqueio', 'extremo', 'coordenação']
  },
  {
    id: 'seg-3',
    question: 'Por que a Conta Master não pode ser pausada ou excluída?',
    answer: 'A Conta Master é protegida automaticamente pelo sistema para evitar bloqueios acidentais do administrador principal. Isso garante que sempre haja pelo menos um usuário com acesso administrativo completo para gerenciar a equipe e resolver problemas.',
    category: 'seguranca',
    tags: ['master', 'proteção', 'admin', 'bloqueio', 'administrador']
  },
  {
    id: 'seg-4',
    question: 'Quais são as boas práticas de segurança para credenciais?',
    answer: 'Nunca compartilhe suas credenciais de acesso. Utilize contas individuais para cada membro da equipe - evite acessos compartilhados. Revise usuários inativos periodicamente. Remova acessos desnecessários após o encerramento do encontro. Proteja a Conta Master.',
    category: 'seguranca',
    tags: ['credenciais', 'senha', 'compartilhar', 'individual', 'acesso']
  },
  {
    id: 'seg-5',
    question: 'Como funciona a proteção contra exclusões acidentais?',
    answer: 'O sistema possui múltiplas camadas de proteção: a exclusão de usuários exige digitar DELETAR para confirmar, a Conta Master não pode ser auto-excluída, e funções administrativas críticas como "Zerar Sistema" exigem credenciais exclusivas da coordenação. Essas medidas evitam perda acidental de dados importantes.',
    category: 'seguranca',
    tags: ['exclusão', 'proteção', 'confirmar', 'deletar', 'acidental']
  },
  {
    id: 'seg-6',
    question: 'Por que algumas senhas não aparecem na documentação?',
    answer: 'Determinadas funções administrativas utilizam chaves de segurança internas que são restritas à coordenação responsável. Essas informações não são divulgadas na Central de Ajuda para preservar a segurança do sistema.',
    category: 'seguranca',
    tags: ['senhas', 'chaves', 'restrito', 'coordenação', 'confidencial']
  },

  // ============================================================
  // ⚠️ PROBLEMAS COMUNS
  // ============================================================
  {
    id: 'prob-1',
    question: 'O sistema entrou em Modo Leitura e não consigo fazer alterações',
    answer: 'Isso ocorre quando você está offline sem sessão validada. Reconecte-se à internet e utilize a opção "Reconectar". O sistema tentará restaurar o funcionamento completo automaticamente.',
    category: 'problemas',
    tags: ['modo leitura', 'alterações', 'reconectar', 'sessão', 'bloqueio']
  },
  {
    id: 'prob-2',
    question: 'Os dados ainda não sincronizaram após a internet voltar',
    answer: 'Aguarde alguns instantes - a sincronização ocorre automaticamente. Se necessário, utilize o botão "Sincronizar" para forçar o envio. Verifique se não há itens na tela de Pendências Offline. Não repita registros já realizados offline.',
    category: 'problemas',
    tags: ['sincronização', 'atraso', 'pendente', 'aguardar', 'offline']
  },
  {
    id: 'prob-3',
    question: 'Não encontro um usuário ou medicamento na lista',
    answer: 'Para usuários: verifique se o cadastro realmente existe e atualize a página para recarregar os dados. Para medicamentos: utilize a busca na Base de Medicamentos - se não existir, realize o cadastro antes de continuar.',
    category: 'problemas',
    tags: ['usuário', 'medicamento', 'lista', 'cadastro', 'busca']
  },
  {
    id: 'prob-4',
    question: 'Não consigo pausar ou excluir um usuário',
    answer: 'Verifique se você possui permissões administrativas. Lembre-se: a Conta Master não pode ser pausada. Para exclusão, confirme que a palavra DELETAR foi digitada corretamente (maiúscula). Se o problema persistir, atualize a página.',
    category: 'problemas',
    tags: ['pausar', 'excluir', 'permissão', 'master', 'deletar']
  },
  {
    id: 'prob-5',
    question: 'O sistema apresenta comportamento inesperado',
    answer: 'Utilize "Recarregar Dados" para atualizar as informações. Se o problema persistir, use "Recarregar Sistema" para recarregar completamente a aplicação. Evite abrir múltiplas abas do sistema simultaneamente. Se nada resolver, contate o suporte técnico.',
    category: 'problemas',
    tags: ['comportamento', 'inesperado', 'recarregar', 'erro', 'suporte']
  },

  // ============================================================
  // ✅ BOAS PRÁTICAS
  // ============================================================
  {
    id: 'bp-1',
    question: 'Quais são as boas práticas para administração de medicações?',
    answer: 'Confirme a identidade do participante antes de qualquer procedimento. Verifique alergias cadastradas antes de administrar medicamentos. Confira nome e dosagem. Registre a administração imediatamente após realizá-la - evite acumular lançamentos. Revise os horários programados regularmente. Consulte a coordenação em caso de dúvida.',
    category: 'boas-praticas',
    tags: ['administração', 'segurança', 'conferência', 'registro', 'alergia']
  },
  {
    id: 'bp-2',
    question: 'Quais são as boas práticas para uso offline?',
    answer: 'Continue trabalhando normalmente mesmo sem internet. Não refaça lançamentos já registrados offline. Aguarde a sincronização automática. Verifique periodicamente o retorno da conexão. Confirme a ausência de pendências antes de encerrar suas atividades. Instale o aplicativo antes do encontro para melhor experiência offline.',
    category: 'boas-praticas',
    tags: ['offline', 'sincronização', 'pendências', 'cuidados', 'conexão']
  },
  {
    id: 'bp-3',
    question: 'Quais são as boas práticas para a Base de Medicamentos?',
    answer: 'Evite nomes duplicados e abreviações desnecessárias. Utilize nomenclaturas padronizadas - mantenha sempre o mesmo padrão de escrita. Revise periodicamente os cadastros existentes. Remova medicamentos cadastrados incorretamente. Cadastre apenas medicamentos realmente utilizados pela equipe.',
    category: 'boas-praticas',
    tags: ['base', 'medicamentos', 'padronização', 'organização', 'nomenclatura']
  },
  {
    id: 'bp-4',
    question: 'Quais são as boas práticas para Gestão de Equipe?',
    answer: 'Mantenha apenas usuários realmente necessários. Revise periodicamente os acessos ativos e os últimos acessos. Pause acessos temporariamente; exclua apenas quando definitivo. Proteja a Conta Master. Cada membro deve ter sua conta individual - nunca compartilhe credenciais. Remova acessos desnecessários após o encontro.',
    category: 'boas-praticas',
    tags: ['equipe', 'gestão', 'acessos', 'credenciais', 'administração']
  },
  {
    id: 'bp-5',
    question: 'Quais são as regras de ouro para uso do sistema?',
    answer: 'Leia sempre as mensagens na tela. Se estiver offline, continue usando normalmente - nada será perdido. Sempre que possível, sincronize os dados. Em caso de dúvida, recarregue o sistema. Não clique várias vezes seguidas no mesmo botão. Não limpe a fila de sincronização sem saber o que está fazendo. Não feche o sistema imediatamente após cadastros offline.',
    category: 'boas-praticas',
    tags: ['regras', 'ouro', 'cuidados', 'essencial', 'fundamental']
  }
];