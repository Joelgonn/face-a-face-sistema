// /application/use-cases/importarEncontristas.ts

type EncontristaImport = {
  nome: string
  alergias: string | null
  observacoes: string | null
  responsavel: string | null
  check_in: boolean
}

type ImportarEncontristasDeps = {
  insertManyRemote: (data: EncontristaImport[]) => Promise<{ error?: unknown; count?: number }>
}

type ImportarEncontristasResult = {
  success: boolean
  count: number
  error?: string
}

export async function importarEncontristas(
  registros: EncontristaImport[],
  deps: ImportarEncontristasDeps
): Promise<ImportarEncontristasResult> {
  if (registros.length === 0) {
    return {
      success: false,
      count: 0,
      error: 'Nenhum registro válido encontrado'
    }
  }

  const { error, count } = await deps.insertManyRemote(registros)

  if (error) {
    return {
      success: false,
      count: 0,
      error: 'Falha na importação'
    }
  }

  return {
    success: true,
    count: count || registros.length
  }
}