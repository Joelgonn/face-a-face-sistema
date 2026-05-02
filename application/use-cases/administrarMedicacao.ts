// /application/use-cases/administrarMedicacao.ts

import { createOfflineId, createQueueItem, createTempId, type QueueItem } from '@/domain/offline/queue.types'
import { verificarConflitoAlergia } from '@/domain/medicacao/alergia.rules'

// --- TIPAGEM ---
export type AdministracaoMedicacao = {
  prescricao_id: number
  data_hora: string
  administrador: string
  offline_id?: string
}

export type AdministrarMedicacaoParams = {
  prescricaoId: number
  pacienteId: number
  nomeMedicamento: string
  alergiasPaciente: string | null
  checkInAtual: boolean
  dataHora: string
  administradorEmail: string
  isOnline: boolean
  offlineId?: string
}

export type AdministrarMedicacaoDeps = {
  insertAdministracaoRemote: (data: AdministracaoMedicacao) => Promise<{ error?: unknown }>
  updateCheckInRemote: (status: boolean) => Promise<{ error?: unknown }>
  addToQueue: (item: QueueItem) => void
}

export type AdministrarMedicacaoResult = {
  success: boolean
  hasAllergyConflict?: boolean
  allergyMessage?: string
  checkInUpdated?: boolean
  queued?: boolean
  tempId?: string
  offlineId?: string
  error?: string
}

// --- USE-CASE ---
export async function administrarMedicacao(
  params: AdministrarMedicacaoParams,
  deps: AdministrarMedicacaoDeps
): Promise<AdministrarMedicacaoResult> {

  const {
    prescricaoId,
    pacienteId,
    nomeMedicamento,
    alergiasPaciente,
    checkInAtual,
    dataHora,
    administradorEmail,
    isOnline,
    offlineId: externalOfflineId
  } = params

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

  const offlineId = externalOfflineId || createOfflineId()

  if (!isOnline) {
    const tempId = createTempId('historico')
    
    deps.addToQueue(
      createQueueItem('administrar_medicacao', {
        offline_id: offlineId,
        pacienteRef: { id: pacienteId },
        prescricaoRef: { id: prescricaoId },
        data_hora: dataHora,
        administrador: administradorEmail || "Desconhecido"
      })
    )

    // 🔥 CORREÇÃO: Removido o item de check-in da fila
    // O check-in offline não é crítico e o tipo CheckinPayload não possui 'status'
    // O comportamento online já atualiza o check-in via updateCheckInRemote.
    // if (!checkInAtual) {
    //   deps.addToQueue(createQueueItem('checkin', { pacienteRef: { id: pacienteId }, status: true }))
    // }

    return {
      success: true,
      queued: true,
      tempId,
      offlineId
    }
  }

  const payload: AdministracaoMedicacao = {
    prescricao_id: prescricaoId,
    data_hora: dataHora,
    administrador: administradorEmail || "Desconhecido",
    offline_id: offlineId
  }

  const { error: administracaoError } = await deps.insertAdministracaoRemote(payload)

  if (administracaoError) {
    return {
      success: false,
      error: 'Erro ao registrar administração'
    }
  }

  let checkInUpdated = false

  if (!checkInAtual) {
    const { error: checkInError } = await deps.updateCheckInRemote(true)
    
    if (!checkInError) {
      checkInUpdated = true
    }
  }

  return {
    success: true,
    checkInUpdated,
    offlineId
  }
}