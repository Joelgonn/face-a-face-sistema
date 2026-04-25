// /application/use-cases/adicionarMedicacao.ts

import { verificarConflitoAlergia } from '@/domain/medicacao/alergia.rules'

// --- TIPAGEM ---
export type NovaMedicacao = {
  encontrista_id: number
  nome_medicamento: string
  dosagem: string
  posologia: string
  horario_inicial: string
}

export type AdicionarMedicacaoParams = {
  pacienteId: number
  medicacao: NovaMedicacao
  alergiasPaciente: string | null
  isOnline: boolean
}

export type AdicionarMedicacaoDeps = {
  insertRemote: (data: NovaMedicacao) => Promise<{ error?: unknown }>
  addToQueue: (item: unknown) => void
}

export type AdicionarMedicacaoResult = {
  success: boolean
  hasAllergyConflict?: boolean
  allergyMessage?: string
  queued?: boolean
  error?: string
}

// --- USE-CASE ---
export async function adicionarMedicacao(
  params: AdicionarMedicacaoParams,
  deps: AdicionarMedicacaoDeps
): Promise<AdicionarMedicacaoResult> {

  const { pacienteId, medicacao, alergiasPaciente, isOnline } = params

  // --- VALIDAÇÃO DE DOMÍNIO ---
  if (!medicacao.nome_medicamento.trim()) {
    return {
      success: false,
      error: 'Nome do medicamento é obrigatório'
    }
  }

  if (medicacao.horario_inicial.length !== 5 || !medicacao.horario_inicial.includes(':')) {
    return {
      success: false,
      error: 'Horário inválido. Use formato HH:MM'
    }
  }

  // --- VERIFICAR CONFLITO DE ALERGIA ---
  const allergyConflict = verificarConflitoAlergia({
    alergiasPaciente,
    nomeMedicamento: medicacao.nome_medicamento
  })

  if (allergyConflict) {
    return {
      success: false,
      hasAllergyConflict: true,
      allergyMessage: allergyConflict
    }
  }

  const payload: NovaMedicacao = {
    encontrista_id: pacienteId,
    nome_medicamento: medicacao.nome_medicamento,
    dosagem: medicacao.dosagem,
    posologia: medicacao.posologia,
    horario_inicial: medicacao.horario_inicial
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue({
      tipo: 'nova_medicacao',
      dados: payload
    })

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE ---
  const { error } = await deps.insertRemote(payload)

  if (error) {
    return {
      success: false,
      error: 'Erro ao salvar no servidor'
    }
  }

  return {
    success: true
  }
}