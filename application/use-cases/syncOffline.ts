// /application/use-cases/syncOffline.ts

export type NovoPacienteData = {
  nome: string
  responsavel: string | null
  alergias: string | null
  observacoes: string | null
  check_in: boolean
}

export type CheckinData = {
  id: number
  status: boolean
}

export type QueueItem =
  | {
      tipo: 'novo'
      dados: NovoPacienteData
    }
  | {
      tipo: 'checkin'
      dados: CheckinData
    }

type SyncOfflineDeps = {
  getQueue: () => QueueItem[]
  saveQueue: (queue: QueueItem[]) => void
  insertNovoPacienteRemote: (data: NovoPacienteData) => Promise<{ error?: unknown }>
  updateCheckinRemote: (id: number, status: boolean) => Promise<{ error?: unknown }>
}

type SyncOfflineResult = {
  total: number
  sucessos: number
  falhas: number
}

export async function syncOffline(deps: SyncOfflineDeps): Promise<SyncOfflineResult> {
  const queue = deps.getQueue()

  if (queue.length === 0) {
    return { total: 0, sucessos: 0, falhas: 0 }
  }

  const novaFila: QueueItem[] = []
  let sucessos = 0

  for (const item of queue) {
    try {
      if (item.tipo === 'novo') {
        const { error } = await deps.insertNovoPacienteRemote(item.dados)
        if (error) throw error
        sucessos++
      }

      if (item.tipo === 'checkin') {
        const { error } = await deps.updateCheckinRemote(item.dados.id, item.dados.status)
        if (error) throw error
        sucessos++
      }
    } catch (err) {
      console.error('[SYNC] erro:', err, item)
      novaFila.push(item)
    }
  }

  deps.saveQueue(novaFila)

  return {
    total: queue.length,
    sucessos,
    falhas: novaFila.length
  }
}