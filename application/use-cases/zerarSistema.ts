// /application/use-cases/zerarSistema.ts

type ZerarSistemaDeps = {
  deleteAllEncontristas: () => Promise<{ error?: unknown }>
  clearQueue: () => void
  verifyAdminPassword: (password: string) => Promise<boolean>
}

type ZerarSistemaResult = {
  success: boolean
  message: string
}

export async function zerarSistema(
  password: string,
  deps: ZerarSistemaDeps
): Promise<ZerarSistemaResult> {
  const isValid = await deps.verifyAdminPassword(password)

  if (!isValid) {
    return {
      success: false,
      message: 'Senha de administrador inválida'
    }
  }

  const { error } = await deps.deleteAllEncontristas()

  if (error) {
    return {
      success: false,
      message: 'Erro ao limpar dados no servidor'
    }
  }

  deps.clearQueue()

  return {
    success: true,
    message: 'Sistema zerado com sucesso'
  }
}