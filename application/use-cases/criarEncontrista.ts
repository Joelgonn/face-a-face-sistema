// /application/use-cases/criarEncontrista.ts

type CriarEncontristaParams = {
  nome: string
  responsavel: string
  alergias: string
  observacoes: string
  isOnline: boolean
}

type NovoEncontrista = {
  nome: string
  responsavel: string
  alergias: string
  observacoes: string
  check_in: boolean
}

type QueueItem = {
  tipo: 'novo'
  dados: NovoEncontrista
}

type CriarEncontristaDeps = {
  insertRemote: (data: NovoEncontrista) => Promise<{ error?: unknown }>
  addToQueue: (item: QueueItem) => void
}

type CriarEncontristaResult = {
  success: boolean
  queued?: boolean
  error?: string
}

export async function criarEncontrista(
  params: CriarEncontristaParams,
  deps: CriarEncontristaDeps
): Promise<CriarEncontristaResult> {

  const { nome, responsavel, alergias, observacoes, isOnline } = params

  // --- VALIDAÇÃO DE DOMÍNIO ---
  if (!nome.trim()) {
    return {
      success: false,
      error: 'Nome é obrigatório'
    }
  }

  const payload: NovoEncontrista = {
    nome,
    responsavel,
    alergias,
    observacoes,
    check_in: false
  }

  // --- OFFLINE ---
  if (!isOnline) {
    deps.addToQueue({
      tipo: 'novo',
      dados: payload
    })

    return {
      success: true,
      queued: true
    }
  }

  // --- ONLINE ---
  const { error } = await deps.insertRemote(payload)

  if (error) {
    return {
      success: false,
      error: 'Erro ao salvar no servidor'
    }
  }

  return {
    success: true
  }
}