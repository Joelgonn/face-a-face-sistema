// /application/use-cases/toggleCheckin.ts

type ToggleCheckinParams = {
  id: number
  statusAtual: boolean | null
  isOnline: boolean
}

type QueueItem = {
  tipo: 'checkin'
  id: number
  status: boolean
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
    deps.addToQueue({
      tipo: 'checkin',
      id,
      status: novoStatus
    })

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