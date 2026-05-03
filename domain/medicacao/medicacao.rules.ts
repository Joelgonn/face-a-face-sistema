// /domain/medicacao/medicacao.rules.ts

export type Prescricao = {
  posologia: string | null
  horario_inicial: string | null
  historico_administracao?: { data_hora: string | null }[]
}

export type PessoaComPrescricao = {
  prescricoes?: Prescricao[]
}

export type StatusPessoa = {
  cor: string
  bordaL: string
  texto: string
  prioridade: number
  icone: 'atrasado' | 'atencao' | 'emdia' | 'sem'
}

// --- TIPAGEM PARA STATUS DE MEDICAÇÃO INDIVIDUAL ---
export type PrescricaoComHistorico = {
  id: number
  nome_medicamento: string | null
  dosagem: string | null
  posologia: string | null
  horario_inicial: string | null
}

export type HistoricoItem = {
  id: number
  data_hora: string | null
  administrador: string | null
  prescricao_id: number
}

// 🔥 NOVO: tipo estruturado para status de medicação
export type StatusMedicacaoTipo = 'atrasado' | 'atencao' | 'emdia' | 'sem_dados'

// 🔥 NOVO: StatusMedicacao agora inclui 'tipo' para ordenação
export type StatusMedicacao = {
  texto: string
  cor: string
  bg: string
  tipo: StatusMedicacaoTipo
}

// 🔥 UTILITY: exhaustiveness checking para switches
export function assertNeverStatus(value: never): never {
  throw new Error(`Unhandled status type: ${value}`)
}

// --- FUNÇÃO PURA (REGRA DE NEGÓCIO) PARA STATUS DO PACIENTE ---
export function calcularStatusPessoa(pessoa: PessoaComPrescricao): StatusPessoa {
  
  if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) {
    return {
      cor: 'bg-slate-100 text-slate-700 border-slate-200',
      bordaL: 'border-l-slate-300',
      texto: 'Sem Meds',
      prioridade: 0,
      icone: 'sem'
    }
  }

  let statusGeral = 3

  for (const med of pessoa.prescricoes) {
    if (!med.posologia || !med.horario_inicial) continue

    const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i)
    if (!match) continue

    const intervaloHoras = parseInt(match[1])

    const historico = [...(med.historico_administracao || [])]
      .filter(h => h.data_hora)
      .sort((a, b) =>
        new Date(b.data_hora as string).getTime() -
        new Date(a.data_hora as string).getTime()
      )

    const ultimo = historico[0]

    const proximoHorario = ultimo?.data_hora
      ? new Date(new Date(ultimo.data_hora).getTime() + intervaloHoras * 60 * 60 * 1000)
      : (() => {
          const [hora, minuto] = med.horario_inicial!.split(':').map(Number)
          const agora = new Date()
          return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora, minuto)
        })()

    const diffMinutos = (proximoHorario.getTime() - new Date().getTime()) / 60000

    if (diffMinutos < 0) {
      statusGeral = 1
      break
    } else if (diffMinutos <= 30) {
      statusGeral = Math.min(statusGeral, 2)
    }
  }

  if (statusGeral === 1) {
    return {
      cor: 'bg-rose-100 text-rose-800 border-rose-200',
      bordaL: 'border-l-rose-500',
      texto: 'Atrasado',
      prioridade: 3,
      icone: 'atrasado'
    }
  }

  if (statusGeral === 2) {
    return {
      cor: 'bg-amber-100 text-amber-800 border-amber-200',
      bordaL: 'border-l-amber-500',
      texto: 'Atenção',
      prioridade: 2,
      icone: 'atencao'
    }
  }

  return {
    cor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bordaL: 'border-l-emerald-500',
    texto: 'Em Dia',
    prioridade: 1,
    icone: 'emdia'
  }
}

// --- FUNÇÃO PURA (REGRA DE NEGÓCIO) PARA STATUS DE MEDICAÇÃO INDIVIDUAL ---
// 🔥 CORRIGIDA: usa .filter().sort()[0] ao invés de .find()
export function calcularStatusMedicacao(
  med: PrescricaoComHistorico,
  historico: HistoricoItem[]
): StatusMedicacao {
  // 🔥 CORREÇÃO: pega o registro MAIS RECENTE, não o primeiro que encontrar
  const ultimoRegistro = historico
    .filter(h => h.prescricao_id === med.id && h.data_hora !== null && h.data_hora !== undefined)
    .sort((a, b) => 
      new Date(b.data_hora!).getTime() - new Date(a.data_hora!).getTime()
    )[0]

  // Caso 1: Dados incompletos
  if (!med.horario_inicial || !med.posologia) {
    return { 
      texto: 'Dados incompletos', 
      cor: 'text-slate-400', 
      bg: 'bg-slate-50',
      tipo: 'sem_dados'
    }
  }

  // Caso 2: Nunca foi administrada
  if (!ultimoRegistro || !ultimoRegistro.data_hora) {
    return { 
      texto: `Início: ${med.horario_inicial}`, 
      cor: 'text-slate-500', 
      bg: 'bg-slate-50',
      tipo: 'sem_dados'
    }
  }

  // Extrai intervalo da posologia (ex: "8/8h" → 8)
  const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i)
  if (!match) {
    return { 
      texto: 'Posologia complexa', 
      cor: 'text-blue-600', 
      bg: 'bg-blue-50',
      tipo: 'sem_dados'
    }
  }

  const intervaloHoras = parseInt(match[1])
  
  // Calcula próximo horário baseado no último registro
  const dataUltima = new Date(ultimoRegistro.data_hora)
  const dataProxima = new Date(dataUltima.getTime() + intervaloHoras * 60 * 60 * 1000)
  const agora = new Date()

  // Formatação para exibição
  const horaFormatada = dataProxima.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    timeZone: 'America/Sao_Paulo' 
  })
  const diaFormatado = dataProxima.getDate() !== agora.getDate() 
    ? `(${dataProxima.getDate()}/${dataProxima.getMonth() + 1})` 
    : ''

  // Caso 3: Atrasado (já passou do horário)
  if (agora > dataProxima) {
    return { 
      texto: `ATRASADO (${horaFormatada})`, 
      cor: 'text-red-600 font-bold', 
      bg: 'bg-red-50',
      tipo: 'atrasado'
    }
  }

  // Caso 4: Atenção (dentro de 30 minutos)
  const diffMinutos = (dataProxima.getTime() - agora.getTime()) / 1000 / 60
  if (diffMinutos < 30) {
    return { 
      texto: `Próxima: ${horaFormatada} ${diaFormatado}`, 
      cor: 'text-amber-600 font-bold', 
      bg: 'bg-amber-50',
      tipo: 'atencao'
    }
  }

  // Caso 5: Em dia
  return { 
    texto: `Próxima: ${horaFormatada} ${diaFormatado}`, 
    cor: 'text-emerald-600 font-bold', 
    bg: 'bg-emerald-50',
    tipo: 'emdia'
  }
}