// /application/use-cases/deletarMedicacao.ts

import { createQueueItem, type QueueItem } from '@/domain/offline/queue.types'

// --- TIPAGEM ---
export type DeletarMedicacaoParams = {
  medicacaoId: number
  isOnline: boolean
}

export type DeletarMedicacaoDeps = {
  deleteHistoricoRemote: (medicacaoId: number) => Promise<{ data: null; error: unknown }>
  deletePrescricaoRemote: (medicacaoId: number) => Promise<{ data: null; error: unknown }>
  addToQueue: (item: QueueItem) => void
}

export type DeletarMedicacaoResult = {
  success: boolean
  queued?: boolean
  error?: string
}

// --- USE-CASE ---
export async function deletarMedicacao(
  params: DeletarMedicacaoParams,
  deps: DeletarMedicacaoDeps
): Promise<DeletarMedicacaoResult> {

  const { medicacaoId, isOnline } = params

  // --- VALIDAÇÃO ---
  if (!medicacaoId) {
    return {
      success: false,
      error: 'ID da medicação inválido'
    }
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue(
      createQueueItem('deletar_medicacao', {
        medicacaoRef: { id: medicacaoId }
      })
    )

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE: DELETAR HISTÓRICO PRIMEIRO ---
  const { error: historicoError } = await deps.deleteHistoricoRemote(medicacaoId)

  // 🔥 CORREÇÃO CRÍTICA: verifica se erro é estritamente diferente de null
  if (historicoError !== null && historicoError !== undefined) {
    console.error('[deletarMedicacao] Erro real ao deletar histórico:', historicoError)
    return {
      success: false,
      error: 'Erro ao excluir histórico da medicação'
    }
  }

  // --- DELETAR PRESCRIÇÃO ---
  const { error: prescricaoError } = await deps.deletePrescricaoRemote(medicacaoId)

  // 🔥 CORREÇÃO CRÍTICA: verifica se erro é estritamente diferente de null
  if (prescricaoError !== null && prescricaoError !== undefined) {
    console.error('[deletarMedicacao] Erro real ao deletar prescrição:', prescricaoError)
    return {
      success: false,
      error: 'Erro ao excluir medicação'
    }
  }

  return {
    success: true
  }
}
