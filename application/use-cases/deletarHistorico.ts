// /application/use-cases/deletarHistorico.ts

// --- TIPAGEM ---
export type DeletarHistoricoParams = {
  historicoId: number
  isOnline: boolean
}

export type DeletarHistoricoDeps = {
  deleteRemote: (historicoId: number) => Promise<{ error?: unknown }>
  addToQueue: (item: unknown) => void
}

export type DeletarHistoricoResult = {
  success: boolean
  queued?: boolean
  error?: string
}

// --- USE-CASE ---
export async function deletarHistorico(
  params: DeletarHistoricoParams,
  deps: DeletarHistoricoDeps
): Promise<DeletarHistoricoResult> {

  const { historicoId, isOnline } = params

  // --- VALIDAÇÃO ---
  if (!historicoId) {
    return {
      success: false,
      error: 'ID do registro de histórico inválido'
    }
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue({
      tipo: 'deletar_historico',
      id: historicoId
    })

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE ---
  const { error } = await deps.deleteRemote(historicoId)

  if (error) {
    return {
      success: false,
      error: 'Erro ao excluir registro do histórico'
    }
  }

  return {
    success: true
  }
}