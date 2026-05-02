// /application/use-cases/adicionarMedicacao.ts

import {
  createOfflineId,
  createQueueItem,
  createTempId,
  type QueueItem,
} from '@/domain/offline/queue.types'
import { verificarConflitoAlergia } from '@/domain/medicacao/alergia.rules'

// --- TIPAGEM ---
export type NovaMedicacao = {
  encontrista_id: number
  nome_medicamento: string
  dosagem: string
  posologia: string
  horario_inicial: string
  offline_id?: string
}

export type AdicionarMedicacaoParams = {
  pacienteId: number
  medicacao: NovaMedicacao
  alergiasPaciente: string | null
  isOnline: boolean
  offlineId?: string  // 🔥 ADICIONADO: permite passar offline_id externo
}

export type AdicionarMedicacaoDeps = {
  insertRemote: (data: NovaMedicacao) => Promise<{ error?: unknown }>
  addToQueue: (item: QueueItem) => void
}

export type AdicionarMedicacaoResult = {
  success: boolean
  hasAllergyConflict?: boolean
  allergyMessage?: string
  queued?: boolean
  tempId?: string
  offlineId?: string
  error?: string
}

// --- USE-CASE ---
export async function adicionarMedicacao(
  params: AdicionarMedicacaoParams,
  deps: AdicionarMedicacaoDeps
): Promise<AdicionarMedicacaoResult> {

  const { pacienteId, medicacao, alergiasPaciente, isOnline, offlineId: externalOfflineId } = params

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

  // 🔥 GARANTE offline_id PARA TODOS OS CASOS
  // Prioridade: externalOfflineId > medicacao.offline_id > createOfflineId()
  const offlineId = externalOfflineId || medicacao.offline_id || createOfflineId()
  
  const payloadComOffline: NovaMedicacao = {
    ...medicacao,
    offline_id: offlineId
  }

  // --- OFFLINE ---
  if (!isOnline) {
    const tempId = createTempId('medicacao')
    
    deps.addToQueue(
      createQueueItem('criar_medicacao', {
        tempId,
        offline_id: offlineId,
        pacienteRef: { id: pacienteId },
        nome_medicamento: payloadComOffline.nome_medicamento,
        dosagem: payloadComOffline.dosagem,
        posologia: payloadComOffline.posologia,
        horario_inicial: payloadComOffline.horario_inicial
      })
    )

    return {
      success: true,
      queued: true,
      tempId,
      offlineId
    }
  }

  // --- ONLINE: 🔥 NÃO REMOVE offline_id - envia para o backend
  const { error } = await deps.insertRemote(payloadComOffline)

  if (error) {
    return {
      success: false,
      error: 'Erro ao salvar no servidor'
    }
  }

  return {
    success: true,
    offlineId
  }
}