// /application/use-cases/toggleCheckin.ts

import { createQueueItem, type QueueItem } from '@/domain/offline/queue.types'

type ToggleCheckinParams = {
  id: number
  statusAtual: boolean | null
  isOnline: boolean
}

type ToggleCheckinDependencies = {
  updateRemote: (id: number, status: boolean) => Promise<{ error?: unknown }>
  addToQueue: (item: QueueItem) => void
}

type ToggleCheckinResult = {
  novoStatus: boolean
  shouldRollback: boolean
  error?: string
  queued?: boolean
}

export async function toggleCheckin(
  params: ToggleCheckinParams,
  deps: ToggleCheckinDependencies
): Promise<ToggleCheckinResult> {

  const { id, statusAtual, isOnline } = params
  const novoStatus = !statusAtual

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue(
      createQueueItem('checkin', {
        pacienteRef: { id },
        check_in: novoStatus
      })
    )

    return {
      novoStatus,
      shouldRollback: false,
      queued: true
    }
  }

  // --- ONLINE ---
  const { error } = await deps.updateRemote(id, novoStatus)

  if (error) {
    return {
      novoStatus,
      shouldRollback: true,
      error: 'Erro ao atualizar no servidor'
    }
  }

  return {
    novoStatus,
    shouldRollback: false
  }
}
