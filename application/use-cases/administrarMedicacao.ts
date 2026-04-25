// /application/use-cases/administrarMedicacao.ts

import { verificarConflitoAlergia } from '@/domain/medicacao/alergia.rules'

// --- TIPAGEM ---
export type AdministracaoMedicacao = {
  prescricao_id: number
  data_hora: string
  administrador: string
}

export type AdministrarMedicacaoParams = {
  prescricaoId: number
  nomeMedicamento: string
  alergiasPaciente: string | null
  checkInAtual: boolean
  dataHora: string
  administradorEmail: string
  isOnline: boolean
}

export type AdministrarMedicacaoDeps = {
  insertAdministracaoRemote: (data: AdministracaoMedicacao) => Promise<{ error?: unknown }>
  updateCheckInRemote: (status: boolean) => Promise<{ error?: unknown }>
  addToQueue: (item: unknown) => void
}

export type AdministrarMedicacaoResult = {
  success: boolean
  hasAllergyConflict?: boolean
  allergyMessage?: string
  checkInUpdated?: boolean
  queued?: boolean
  error?: string
}

// --- USE-CASE ---
export async function administrarMedicacao(
  params: AdministrarMedicacaoParams,
  deps: AdministrarMedicacaoDeps
): Promise<AdministrarMedicacaoResult> {

  const {
    prescricaoId,
    nomeMedicamento,
    alergiasPaciente,
    checkInAtual,
    dataHora,
    administradorEmail,
    isOnline
  } = params

  // --- VALIDAÇÃO ---
  if (!nomeMedicamento) {
    return {
      success: false,
      error: 'Medicamento inválido'
    }
  }

  if (!dataHora) {
    return {
      success: false,
      error: 'Horário de administração obrigatório'
    }
  }

  // --- VERIFICAR CONFLITO DE ALERGIA ---
  const allergyConflict = verificarConflitoAlergia({
    alergiasPaciente,
    nomeMedicamento
  })

  if (allergyConflict) {
    return {
      success: false,
      hasAllergyConflict: true,
      allergyMessage: allergyConflict
    }
  }

  const payload: AdministracaoMedicacao = {
    prescricao_id: prescricaoId,
    data_hora: dataHora,
    administrador: administradorEmail || "Desconhecido"
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue({
      tipo: 'administrar_medicacao',
      dados: payload
    })

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE: REGISTRAR ADMINISTRAÇÃO ---
  const { error: administracaoError } = await deps.insertAdministracaoRemote(payload)

  if (administracaoError) {
    return {
      success: false,
      error: 'Erro ao registrar administração'
    }
  }

  // --- AUTO CHECK-IN: Se estava ausente, vira presente ---
  let checkInUpdated = false

  if (!checkInAtual) {
    const { error: checkInError } = await deps.updateCheckInRemote(true)
    
    if (!checkInError) {
      checkInUpdated = true
    }
    // Se falhar o check-in, não falhamos a administração
    // Apenas não atualizamos o estado
  }

  return {
    success: true,
    checkInUpdated
  }
}