// /infra/repositories/encontrista.repository.ts

import { Database } from '@/types/supabase'

// --- TIPAGEM ---
type EncontristaRow = Database['public']['Tables']['encontristas']['Row']
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row']
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row']

export type EncontristaComPrescricoes = EncontristaRow & {
  prescricoes: (Pick<PrescricaoRow, 'id' | 'posologia' | 'horario_inicial' | 'nome_medicamento' | 'dosagem'> & {
    historico_administracao: Pick<HistoricoRow, 'data_hora'>[]
  })[]
}

export type EncontristaCompleto = EncontristaRow & {
  prescricoes: (Pick<PrescricaoRow, 'id' | 'nome_medicamento' | 'dosagem' | 'posologia' | 'horario_inicial'>)[]
  historico: (HistoricoRow & {
    prescricao: Pick<PrescricaoRow, 'nome_medicamento' | 'dosagem'> | null
  })[]
}

type RepositoryResponse<T> = {
  data: T | null
  error: string | null
}

// --- TIPO DO CLIENT SUPABASE (GENÉRICO) ---
type SupabaseClient = any

// --- FACTORY QUE RECEBE O CLIENT INJETADO ---
export function createEncontristaRepository(supabase: SupabaseClient) {
  return {

    async findAll(): Promise<RepositoryResponse<EncontristaComPrescricoes[]>> {
      try {
        const { data, error } = await supabase
          .from('encontristas')
          .select(`
            *,
            prescricoes (
              id,
              posologia,
              horario_inicial,
              historico_administracao (data_hora)
            )
          `)
          .order('nome', { ascending: true })

        if (error) {
          console.error('[REPOSITORY] Erro ao buscar encontristas:', error)
          return { data: null, error: error.message }
        }

        return { data: data as EncontristaComPrescricoes[], error: null }

      } catch (err) {
        console.error('[REPOSITORY] Erro inesperado:', err)
        return { data: null, error: 'Erro inesperado ao buscar dados.' }
      }
    },

    async findByIdWithDetails(id: number): Promise<RepositoryResponse<EncontristaCompleto>> {
      try {
        // 1. Buscar encontrista com prescrições
        const { data: encontrista, error: encontristaError } = await supabase
          .from('encontristas')
          .select(`
            *,
            prescricoes (
              id,
              nome_medicamento,
              dosagem,
              posologia,
              horario_inicial
            )
          `)
          .eq('id', id)
          .single()

        if (encontristaError) {
          console.error('[REPOSITORY] Erro ao buscar encontrista:', encontristaError)
          return { data: null, error: encontristaError.message }
        }

        const prescricoes: { id: number; nome_medicamento: string | null; dosagem: string | null; posologia: string | null; horario_inicial: string | null }[] = encontrista?.prescricoes || []
        const prescricoesIds: number[] = prescricoes.map((p: { id: number }) => p.id)

        // 2. Buscar histórico (apenas se houver prescrições)
        let historico: (HistoricoRow & { prescricao: { nome_medicamento: string; dosagem: string } | null })[] = []

        if (prescricoesIds.length > 0) {
          const { data: historicoData, error: historicoError } = await supabase
            .from('historico_administracao')
            .select(`
              *,
              prescricao:prescricoes (
                nome_medicamento,
                dosagem
              )
            `)
            .in('prescricao_id', prescricoesIds)
            .order('data_hora', { ascending: false })

          if (historicoError) {
            console.error('[REPOSITORY] Erro ao buscar histórico:', historicoError)
          } else {
            historico = historicoData || []
          }
        }

        return {
          data: {
            ...encontrista,
            prescricoes: prescricoes,
            historico: historico
          } as EncontristaCompleto,
          error: null
        }

      } catch (err) {
        console.error('[REPOSITORY] Erro inesperado:', err)
        return { data: null, error: 'Erro inesperado ao buscar dados do paciente.' }
      }
    }
  }
}