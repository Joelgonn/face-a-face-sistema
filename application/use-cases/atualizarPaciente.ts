// /application/use-cases/atualizarPaciente.ts

import { createQueueItem, type QueueItem } from '@/domain/offline/queue.types'

// --- TIPAGEM ---
export type DadosAtualizadosPaciente = {
  nome: string
  responsavel: string
  alergias: string
  observacoes: string
}

export type AtualizarPacienteParams = {
  pacienteId: number
  dados: DadosAtualizadosPaciente
  isOnline: boolean
}

export type AtualizarPacienteDeps = {
  updateRemote: (id: number, data: DadosAtualizadosPaciente) => Promise<{ error?: unknown }>
  addToQueue: (item: QueueItem) => void
}

export type AtualizarPacienteResult = {
  success: boolean
  queued?: boolean
  error?: string
}

// --- USE-CASE ---
export async function atualizarPaciente(
  params: AtualizarPacienteParams,
  deps: AtualizarPacienteDeps
): Promise<AtualizarPacienteResult> {

  const { pacienteId, dados, isOnline } = params

  // --- VALIDAÇÃO ---
  if (!pacienteId) {
    return {
      success: false,
      error: 'ID do paciente inválido'
    }
  }

  if (!dados.nome || dados.nome.trim() === '') {
    return {
      success: false,
      error: 'Nome do paciente é obrigatório'
    }
  }

  const payload: DadosAtualizadosPaciente = {
    nome: dados.nome.trim(),
    responsavel: dados.responsavel?.trim() || '',
    alergias: dados.alergias?.trim() || '',
    observacoes: dados.observacoes?.trim() || ''
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue(
      createQueueItem('atualizar_paciente', {
        pacienteRef: { id: pacienteId },
        ...payload
      })
    )

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE ---
  const { error } = await deps.updateRemote(pacienteId, payload)

  if (error) {
    return {
      success: false,
      error: 'Erro ao salvar alterações no servidor'
    }
  }

  return {
    success: true
  }
}
