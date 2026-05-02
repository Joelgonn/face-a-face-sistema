'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { EncontristaContainer } from './EncontristaContainer'
import { getPaciente } from '@/app/lib/offlineRepository'
import { type Database } from '@/types/supabase'
import { useOfflineNavigation } from '@/app/hooks/useOfflineNavigation'

// --- TIPAGEM ---
export type EncontristaRow = Database['public']['Tables']['encontristas']['Row']
export type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row']
export type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row']
export type MedicamentoRow = Database['public']['Tables']['medicamentos']['Row']

export type HistoricoItem = Omit<HistoricoRow, 'prescricao_id'> & {
  prescricao_id: number
  prescricao: {
    nome_medicamento: string | null
    dosagem: string | null
  } | null
}

export type PacienteCompleto = EncontristaRow & {
  prescricoes: PrescricaoRow[]
  historico: HistoricoItem[]
}

type PageProps = {
  params: {
    id: string
  }
}

function isHistoricoValido(h: HistoricoItem): h is HistoricoItem & { prescricao_id: number } {
  return h.prescricao_id !== null
}

export default function EncontristaPage({ params }: PageProps) {
  const supabase = createClient()
  const { navigateTo } = useOfflineNavigation()
  const pacienteId = parseInt(params.id)
  
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null)
  const [baseMedicamentos, setBaseMedicamentos] = useState<MedicamentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [isDegradedMode, setIsDegradedMode] = useState(false)
  const [shouldLoadFromCache, setShouldLoadFromCache] = useState(false)

  // 🔥 Verificar status de conexão
  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    checkOnlineStatus()
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)

    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
    }
  }, [])

  // 🔥 Buscar medicamentos base
  const fetchBaseMedicamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('medicamentos')
        .select('*')
        .order('nome', { ascending: true })
      
      if (!error && data) {
        setBaseMedicamentos(data as MedicamentoRow[])
      }
    } catch (error) {
      console.error('[PAGE] Erro ao buscar medicamentos base:', error)
    }
  }

  // 🔥 Buscar dados do paciente
  const fetchPacienteData = async () => {
    setLoading(true)
    
    try {
      const { data: pessoa, error: pessoaError } = await supabase
        .from('encontristas')
        .select('*')
        .eq('id', pacienteId)
        .single()

      if (pessoaError) {
        console.error('[PAGE] Erro ao buscar paciente:', pessoaError)
        
        const cached = await getPaciente(pacienteId)
        if (cached) {
          setPaciente({
            ...cached.paciente,
            prescricoes: cached.medicacoes,
            historico: cached.historico as unknown as HistoricoItem[]
          })
          setIsDegradedMode(true)
          setShouldLoadFromCache(true)
          setLoading(false)
          return
        } else {
          navigateTo('/dashboard')
          return
        }
      }

      if (!pessoa) {
        navigateTo('/dashboard')
        return
      }

      const { data: prescricoes, error: prescError } = await supabase
        .from('prescricoes')
        .select('*')
        .eq('encontrista_id', pacienteId)
        .order('id', { ascending: true })

      if (prescError) {
        console.error('[PAGE] Erro ao buscar prescrições:', prescError)
      }

      const prescricoesData = prescricoes || []
      const prescricaoIds = prescricoesData.map(p => p.id)
      
      let historicoData: HistoricoItem[] = []
      
      if (prescricaoIds.length > 0) {
        const { data: historico, error: histError } = await supabase
          .from('historico_administracao')
          .select(`
            *,
            prescricao:prescricoes (
              nome_medicamento,
              dosagem
            )
          `)
          .in('prescricao_id', prescricaoIds)
          .order('data_hora', { ascending: false })

        if (!histError && historico) {
          historicoData = (historico as unknown as HistoricoItem[]).filter(isHistoricoValido)
        }
      }

      setPaciente({
        ...pessoa,
        prescricoes: prescricoesData,
        historico: historicoData
      })
      
      setIsDegradedMode(false)
      setShouldLoadFromCache(false)
      
    } catch (error) {
      console.error('[PAGE] Erro inesperado:', error)
      
      const cached = await getPaciente(pacienteId)
      if (cached) {
        setPaciente({
          ...cached.paciente,
          prescricoes: cached.medicacoes,
          historico: cached.historico as unknown as HistoricoItem[]
        })
        setIsDegradedMode(true)
        setShouldLoadFromCache(true)
      } else {
        navigateTo('/dashboard')
        return
      }
    } finally {
      setLoading(false)
    }
  }

  // 🔥 Efeito principal
  useEffect(() => {
    if (isNaN(pacienteId)) {
      navigateTo('/dashboard')
      return
    }
    
    fetchBaseMedicamentos()
    fetchPacienteData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId])

  // 🔥 Loading state
  if (loading && !paciente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  // 🔥 Paciente não encontrado
  if (!paciente) {
    return null
  }

  // 🔥 Renderiza o Container
  return (
    <EncontristaContainer
      paciente={paciente}
      baseMedicamentos={baseMedicamentos}
      isOffline={isOffline}
      isDegradedMode={isDegradedMode}
      shouldLoadFromCache={shouldLoadFromCache}
    />
  )
}