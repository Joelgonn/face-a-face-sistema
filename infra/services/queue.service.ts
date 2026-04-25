// /infra/services/queue.service.ts

export type QueueItem =
  | {
      tipo: 'novo'
      dados: {
        nome: string
        responsavel: string | null
        alergias: string | null
        observacoes: string | null
        check_in: boolean
      }
    }
  | {
      tipo: 'checkin'
      id: number
      status: boolean
    }

const STORAGE_KEY = 'offlineQueue'

export const queueService = {
  getQueue(): QueueItem[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  saveQueue(queue: QueueItem[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  },

  addToQueue(item: QueueItem): void {
    const queue = this.getQueue()
    queue.push(item)
    this.saveQueue(queue)
  },

  clearQueue(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  },

  getQueueCount(): number {
    return this.getQueue().length
  }
}