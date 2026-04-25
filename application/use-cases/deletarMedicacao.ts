// /application/use-cases/deletarMedicacao.ts

// --- TIPAGEM ---
export type DeletarMedicacaoParams = {
  medicacaoId: number
  isOnline: boolean
}

export type DeletarMedicacaoDeps = {
  deleteHistoricoRemote: (medicacaoId: number) => Promise<{ error?: unknown }>
  deletePrescricaoRemote: (medicacaoId: number) => Promise<{ error?: unknown }>
  addToQueue: (item: unknown) => void
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
    deps.addToQueue({
      tipo: 'deletar_medicacao',
      id: medicacaoId
    })

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE: DELETAR HISTÓRICO PRIMEIRO ---
  const { error: historicoError } = await deps.deleteHistoricoRemote(medicacaoId)

  if (historicoError) {
    return {
      success: false,
      error: 'Erro ao excluir histórico da medicação'
    }
  }

  // --- DELETAR PRESCRIÇÃO ---
  const { error: prescricaoError } = await deps.deletePrescricaoRemote(medicacaoId)

  if (prescricaoError) {
    return {
      success: false,
      error: 'Erro ao excluir medicação'
    }
  }

  return {
    success: true
  }
}