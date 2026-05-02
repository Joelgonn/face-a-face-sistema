'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { EncontristaView } from './EncontristaView'
import { calcularStatusMedicacao } from '@/domain/medicacao/medicacao.rules'
import { adicionarMedicacao } from '@/application/use-cases/adicionarMedicacao'
import { administrarMedicacao } from '@/application/use-cases/administrarMedicacao'
import { deletarMedicacao } from '@/application/use-cases/deletarMedicacao'
import { atualizarPaciente } from '@/application/use-cases/atualizarPaciente'
import { deletarHistorico } from '@/application/use-cases/deletarHistorico'
import { queueService } from '@/infra/offline/queue.service'
import { Database } from '@/types/supabase'
import { getPaciente, savePaciente } from '@/app/lib/offlineRepository'
import { useOfflineNavigation } from '@/app/hooks/useOfflineNavigation'

// --- TIPAGEM ---
type EncontristaRow = Database['public']['Tables']['encontristas']['Row']
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row']
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row']
type MedicamentoBaseRow = Database['public']['Tables']['medicamentos']['Row']

// 🔥 Estende PrescricaoRow com propriedades offline
export interface PrescricaoComOffline extends PrescricaoRow {
  _offline?: boolean
  _tempId?: string
  offline_id?: string
  isOfflineUpdate?: boolean
  ultima_administracao?: string | null
}

// 🔥 Estende HistoricoRow com propriedades offline
export interface HistoricoItemComOffline extends HistoricoRow {
  prescricao_id: number
  prescricao: { nome_medicamento: string | null; dosagem: string | null } | null
  _offline?: boolean
  _tempId?: string
  offline_id?: string
  isOffline?: boolean
}

export type Prescricao = PrescricaoRow
export type HistoricoItem = HistoricoRow & {
  prescricao_id: number
  prescricao: { nome_medicamento: string | null; dosagem: string | null } | null
}

export type PacienteCompleto = EncontristaRow & {
  prescricoes: PrescricaoRow[]
  historico: HistoricoItem[]
}

type Props = {
  paciente: PacienteCompleto
  baseMedicamentos: MedicamentoBaseRow[]
  isOffline?: boolean
  isDegradedMode?: boolean
  shouldLoadFromCache?: boolean
}

// --- TYPE GUARD ---
function isHistoricoValido(
  h: HistoricoRow & { prescricao: { nome_medicamento: string | null; dosagem: string | null } | null }
): h is HistoricoItem {
  return h.prescricao_id !== null
}

// --- FUNÇÃO DE STATUS COM DETECÇÃO DE OFFLINE ---
export function getStatusMedicacao(med: PrescricaoRow, historico: HistoricoItem[]) {
  const medTyped = med as PrescricaoComOffline
  
  if (medTyped.isOfflineUpdate) {
    return {
      texto: '✅ Administrado (pendente sync)',
      cor: 'text-green-600',
      bg: 'bg-green-50'
    }
  }
  
  if (medTyped._offline) {
    return {
      texto: '⏳ Pendente (offline)',
      cor: 'text-yellow-600',
      bg: 'bg-yellow-50'
    }
  }

  const status = calcularStatusMedicacao(med, historico)
  return {
    texto: status.texto,
    cor: status.cor,
    bg: status.bg
  }
}

export function EncontristaContainer({ 
  paciente: pacienteInicial, 
  baseMedicamentos,
  isOffline: serverOffline = false,
  isDegradedMode: serverDegradedMode = false,
  shouldLoadFromCache = false
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { navigateTo, prefetchAndCache } = useOfflineNavigation()

  // --- STATE (DESACOPLADO PARA OPTIMISTIC UI) ---
  const [paciente, setPaciente] = useState<PacienteCompleto>(pacienteInicial)
  const [medicacoes, setMedicacoes] = useState<PrescricaoComOffline[]>(
    (pacienteInicial.prescricoes || []) as PrescricaoComOffline[]
  )
  const [historico, setHistorico] = useState<HistoricoItemComOffline[]>(
    (pacienteInicial.historico || []).filter(isHistoricoValido) as HistoricoItemComOffline[]
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const [isOnline, setIsOnline] = useState(!serverOffline)
  const [isDegradedMode, setIsDegradedMode] = useState(serverDegradedMode)
  const [initializedFromCache, setInitializedFromCache] = useState(false)

  // --- MODAL DE MEDICAÇÃO ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [medNome, setMedNome] = useState('')
  const [medDosagem, setMedDosagem] = useState('')
  const [medPosologia, setMedPosologia] = useState('')
  const [medHorario, setMedHorario] = useState('')
  const [sugestoes, setSugestoes] = useState<MedicamentoBaseRow[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // --- MODAL DE ADMINISTRAÇÃO ---
  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false)
  const [selectedPrescricao, setSelectedPrescricao] = useState<PrescricaoComOffline | null>(null)
  const [horaAdministracao, setHoraAdministracao] = useState('')

  // --- MODAIS DE CONFIRMAÇÃO ---
  const [medicationToDelete, setMedicationToDelete] = useState<number | null>(null)
  const [historyToDelete, setHistoryToDelete] = useState<number | null>(null)
  const [allergyWarning, setAllergyWarning] = useState<{ show: boolean; message: string; onConfirm: () => void } | null>(null)

  // --- MODAL DE EDIÇÃO ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editResponsavel, setEditResponsavel] = useState('')
  const [editAlergias, setEditAlergias] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')

  // ✅ NOVO: Cachear a rota do encontrista atual para acesso offline
  useEffect(() => {
    if (paciente?.id && paciente.id > 0) {
      const rotaAtual = `/dashboard/encontrista/${paciente.id}`
      prefetchAndCache(rotaAtual)
      console.log(`[CACHE] Pré-cacheando rota atual: ${rotaAtual}`)
    }
  }, [paciente?.id, prefetchAndCache])

  // 🔥 NOVO: Sincronizar estado quando paciente inicial muda
  useEffect(() => {
    if (pacienteInicial) {
      setPaciente(pacienteInicial)
      setMedicacoes((pacienteInicial.prescricoes || []) as PrescricaoComOffline[])
      setHistorico((pacienteInicial.historico || []).filter(isHistoricoValido) as HistoricoItemComOffline[])
    }
  }, [pacienteInicial])

  // ============================================================
  // 🔥 PREFETCH DA ROTA DASHBOARD PARA OFFLINE
  // ============================================================
  useEffect(() => {
    if (router && typeof window !== 'undefined') {
      router.prefetch('/dashboard')
    }
  }, [router])

  // ============================================================
  // 🔥 FUNÇÃO AUXILIAR: GERAR ID OFFLINE SEGURO
  // ============================================================
  const gerarOfflineId = useCallback((): number => {
    return -Math.floor(Math.random() * 1_000_000_000)
  }, [])

  // ============================================================
  // 🔥 FUNÇÃO AUXILIAR: converter string offline_id para número determinístico
  // ============================================================
  const offlineIdParaNumero = useCallback((offlineId: string): number => {
    const numericMatch = offlineId.match(/\d+/)
    if (numericMatch) {
      return -Math.abs(parseInt(numericMatch[0], 10))
    }
    const soma = offlineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return -Math.abs(soma)
  }, [])

  // ============================================================
  // 🔥 FUNÇÃO AUXILIAR: SALVAR TUDO NO CACHE
  // ============================================================
  const salvarCacheCompleto = useCallback(async () => {
    if (saving) return
    if (isDegradedMode || !paciente.id || !paciente.nome || paciente.nome === 'Carregando...') return
    
    await savePaciente({
      id: paciente.id,
      paciente: { ...paciente },
      medicacoes: [...medicacoes],
      historico: [...historico]
    })
  }, [paciente, medicacoes, historico, isDegradedMode, saving])

  // ============================================================
  // 🔥 FUNÇÃO CRÍTICA: MERGE DE DADOS ONLINE + OFFLINE PENDENTE
  // ============================================================
  const mergeMedicacoesComOffline = useCallback((
    medicacoesOnline: PrescricaoRow[],
    medicacoesOfflineAtuais: PrescricaoComOffline[]
  ): PrescricaoComOffline[] => {
    const offlinePendentes = medicacoesOfflineAtuais.filter(m => m._offline === true)
    
    if (!medicacoesOnline || medicacoesOnline.length === 0) {
      return [...offlinePendentes]
    }
    
    const onlineFiltrados = medicacoesOnline.filter(online => {
      return !offlinePendentes.some(offline => {
        const offlineWithId = offline as PrescricaoComOffline
        const onlineWithId = online as PrescricaoComOffline
        if (offlineWithId.offline_id && onlineWithId.offline_id === offlineWithId.offline_id) {
          return true
        }
        return offline.nome_medicamento === online.nome_medicamento &&
          offline.horario_inicial === online.horario_inicial &&
          offline.dosagem === online.dosagem
      })
    })
    
    return [...onlineFiltrados, ...offlinePendentes] as PrescricaoComOffline[]
  }, [])

  const mergeHistoricoComOffline = useCallback((
    historicoOnline: HistoricoItem[],
    historicoOfflineAtuais: HistoricoItemComOffline[]
  ): HistoricoItemComOffline[] => {
    const offlinePendentes = historicoOfflineAtuais.filter(h => h._offline === true)
    
    if (!historicoOnline || historicoOnline.length === 0) {
      return [...offlinePendentes]
    }
    
    const onlineFiltrados = historicoOnline.filter(online => {
      return !offlinePendentes.some(offline => {
        const offlineWithId = offline as HistoricoItemComOffline
        const onlineWithId = online as HistoricoItemComOffline
        if (offlineWithId.offline_id && onlineWithId.offline_id === offlineWithId.offline_id) {
          return true
        }
        return offline.prescricao_id === online.prescricao_id &&
          offline.data_hora === online.data_hora
      })
    })
    
    return [...onlineFiltrados, ...offlinePendentes] as HistoricoItemComOffline[]
  }, [])

  // ============================================================
  // 🔥 FUNÇÃO DE LIMPEZA APÓS SYNC
  // ============================================================
  const limparItensOfflineSincronizados = useCallback(async (tempIdsSincronizados: string[]) => {
    console.log('[OFFLINE_SYNC] Limpando itens sincronizados:', tempIdsSincronizados)
    
    const novasMedicacoes = medicacoes.map(med => {
      if (med._tempId && tempIdsSincronizados.includes(med._tempId)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _offline, _tempId, isOfflineUpdate, ...medLimpo } = med
        return medLimpo as PrescricaoComOffline
      }
      if (med.isOfflineUpdate) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isOfflineUpdate, ...medLimpo } = med
        return medLimpo as PrescricaoComOffline
      }
      return med
    })
    
    const novoHistorico = historico.map(h => {
      if (h._tempId && tempIdsSincronizados.includes(h._tempId)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _offline, _tempId, isOffline, ...hLimpo } = h
        return hLimpo as HistoricoItemComOffline
      }
      if (h.isOffline) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isOffline, ...hLimpo } = h
        return hLimpo as HistoricoItemComOffline
      }
      return h
    })
    
    setMedicacoes(novasMedicacoes)
    setHistorico(novoHistorico)
    
    await savePaciente({
      id: paciente.id,
      paciente: { ...paciente },
      medicacoes: [...novasMedicacoes],
      historico: [...novoHistorico]
    })
  }, [medicacoes, historico, paciente])

  // ============================================================
  // 🔥 EVENT LISTENER PARA SYNC
  // ============================================================
  useEffect(() => {
    const handler = (event: CustomEvent<{ tempIds: string[] }>) => {
      console.log('[OFFLINE_SYNC] Evento recebido:', event.detail)
      limparItensOfflineSincronizados(event.detail.tempIds)
    }

    window.addEventListener('offline-sync-success', handler as EventListener)
    return () => window.removeEventListener('offline-sync-success', handler as EventListener)
  }, [limparItensOfflineSincronizados])

  // ============================================================
  // 🔥 CARREGAR DO CACHE ANTES DO PRIMEIRO RENDER
  // ============================================================
  useEffect(() => {
    if (!shouldLoadFromCache || !paciente.id || initializedFromCache) return

    let cancelled = false

    const loadFromCache = async () => {
      const cached = await getPaciente(paciente.id)
      if (cancelled) return

      if (cached) {
        setPaciente({
          ...cached.paciente,
          prescricoes: cached.medicacoes,
          historico: cached.historico.filter(isHistoricoValido)
        })
        setMedicacoes(cached.medicacoes as PrescricaoComOffline[])
        setHistorico(cached.historico.filter(isHistoricoValido) as HistoricoItemComOffline[])
        setIsDegradedMode(false)
      }

      setInitializedFromCache(true)
    }

    void loadFromCache()

    return () => {
      cancelled = true
    }
  }, [shouldLoadFromCache, paciente.id, initializedFromCache])

  // ============================================================
  // 🔥 SALVAR NO CACHE
  // ============================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      void salvarCacheCompleto()
    }, 500)

    return () => clearTimeout(timer)
  }, [salvarCacheCompleto])

  // ============================================================
  // HANDLER: RELOAD
  // ============================================================
  const reload = useCallback(async () => {
    if (isDegradedMode) return
    
    setLoading(true)

    const { data: pessoaAtualizada } = await supabase
      .from('encontristas')
      .select('*')
      .eq('id', paciente.id)
      .single()

    if (pessoaAtualizada) {
      setPaciente(prev => ({
        ...prev,
        nome: pessoaAtualizada.nome,
        responsavel: pessoaAtualizada.responsavel,
        alergias: pessoaAtualizada.alergias,
        observacoes: pessoaAtualizada.observacoes,
        check_in: pessoaAtualizada.check_in,
        created_at: pessoaAtualizada.created_at
      }))
    }

    const { data: medData } = await supabase
      .from('prescricoes')
      .select('*')
      .eq('encontrista_id', paciente.id)
      .order('id', { ascending: true })

    let historicoFiltrado: HistoricoItem[] = []
    let medicacoesComOffline: PrescricaoComOffline[] = []
    let historicoComOffline: HistoricoItemComOffline[] = []

    if (medData) {
      medicacoesComOffline = mergeMedicacoesComOffline(medData, medicacoes)
      setMedicacoes(medicacoesComOffline)

      const ids = medData.map(m => m.id)

      if (ids.length > 0) {
        const { data: histData } = await supabase
          .from('historico_administracao')
          .select(`
            *,
            prescricao:prescricoes (nome_medicamento, dosagem)
          `)
          .in('prescricao_id', ids)
          .order('data_hora', { ascending: false })

        historicoFiltrado = (histData || []).filter(isHistoricoValido)
        historicoComOffline = mergeHistoricoComOffline(historicoFiltrado, historico)
        setHistorico(historicoComOffline)
      } else {
        historicoComOffline = historico
        setHistorico(historico)
      }
    } else {
      medicacoesComOffline = [...medicacoes]
      historicoComOffline = [...historico]
    }

    if (pessoaAtualizada) {
      await savePaciente({
        id: paciente.id,
        paciente: pessoaAtualizada,
        medicacoes: [...medicacoesComOffline],
        historico: [...historicoComOffline]
      })
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id, supabase, isDegradedMode, medicacoes, historico, mergeMedicacoesComOffline, mergeHistoricoComOffline])

  // ============================================================
  // ✅ PASSO 3 CORREÇÃO: HANDLER: VOLTAR COM REFRESH (VERSÃO OFFLINE-SAFE)
  // ============================================================
  const goBackWithRefresh = useCallback(() => {
    window.dispatchEvent(new Event('dashboard-refresh'))
    navigateTo('/dashboard')
  }, [navigateTo])

  // ============================================================
  // 🔥 HANDLER: ADICIONAR MEDICAÇÃO (COM OPTIMISTIC UI)
  // ============================================================
  const executarAdicionarMedicacao = useCallback(async () => {
    setSaving(true)

    const result = await adicionarMedicacao(
      {
        pacienteId: paciente.id,
        medicacao: {
          encontrista_id: paciente.id,
          nome_medicamento: medNome,
          dosagem: medDosagem,
          posologia: medPosologia,
          horario_inicial: medHorario
        },
        alergiasPaciente: paciente.alergias,
        isOnline,
        offlineId: undefined
      },
      {
        insertRemote: async (data) => {
          return await supabase.from('prescricoes').insert(data)
        },
        addToQueue: (item) => {
          queueService.enqueue(item)
        }
      }
    )

    if (result.hasAllergyConflict) {
      setAllergyWarning({
        show: true,
        message: result.allergyMessage || '',
        onConfirm: () => {
          setAllergyWarning(null)
          executarAdicionarMedicacao()
        }
      })
      setSaving(false)
      return
    }

    if (result.queued) {
      if (!result.tempId) {
        console.error('[ERRO] TempId não retornado no modo offline')
        alert('❌ Erro interno: não foi possível identificar o item offline')
        setSaving(false)
        return
      }
      
      alert('📱 Medicação salva offline. Será sincronizada quando a internet voltar.')
      
      const tempId = result.tempId
      const offlineId = result.offlineId || gerarOfflineId().toString()
      const offlineIdNum = offlineIdParaNumero(offlineId)
      
      const novaMedicacao: PrescricaoComOffline = {
        id: offlineIdNum,
        encontrista_id: paciente.id,
        nome_medicamento: medNome,
        dosagem: medDosagem,
        posologia: medPosologia,
        horario_inicial: medHorario,
        observacao: null, // ✅ Campo obrigatório
        _offline: true,
        _tempId: tempId,
        offline_id: offlineId,
        created_at: new Date().toISOString()
      } as PrescricaoComOffline
      
      const novasMedicacoes = [...medicacoes, novaMedicacao]
      setMedicacoes(novasMedicacoes)
      
      await savePaciente({
        id: paciente.id,
        paciente: { ...paciente },
        medicacoes: [...novasMedicacoes],
        historico: [...historico]
      })
      
      setMedNome('')
      setMedDosagem('')
      setMedPosologia('')
      setMedHorario('')
      setIsModalOpen(false)
    } else if (result.success) {
      setMedNome('')
      setMedDosagem('')
      setMedPosologia('')
      setMedHorario('')
      setIsModalOpen(false)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao adicionar medicação'}`)
    }

    setSaving(false)
  }, [medNome, medDosagem, medPosologia, medHorario, paciente, isOnline, supabase, medicacoes, historico, gerarOfflineId, offlineIdParaNumero, reload])

  const handleAdicionarMedicacao = useCallback(async () => {
    if (medHorario.length !== 5 || !medHorario.includes(':')) {
      alert("⚠️ Horário inválido. Use formato HH:MM")
      return
    }

    await executarAdicionarMedicacao()
  }, [executarAdicionarMedicacao, medHorario])

  // ============================================================
  // 🔥 HANDLER: ADMINISTRAR MEDICAÇÃO (COM OPTIMISTIC UI)
  // ============================================================
  const handleAdministrarMedicacao = useCallback(async (prescricao: PrescricaoComOffline) => {
    setSelectedPrescricao(prescricao)
    setAllergyWarning(null)

    const jaFoiAdministrado = historico.some(h => h.prescricao_id === prescricao.id)
    if (!jaFoiAdministrado && prescricao.horario_inicial) {
      setHoraAdministracao(prescricao.horario_inicial)
    } else {
      setHoraAdministracao(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }))
    }
    setIsAdministerModalOpen(true)
  }, [historico])

  const executarAdministracao = useCallback(async () => {
    if (!selectedPrescricao) return

    setSaving(true)

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    const dataHoraFixa = `${ano}-${mes}-${dia}T${horaAdministracao}:00.000-03:00`

    const { data: { user } } = await supabase.auth.getUser()
    const offlineIdDaPrescricao = selectedPrescricao.offline_id

    const result = await administrarMedicacao(
      {
        prescricaoId: selectedPrescricao.id,
        pacienteId: paciente.id,
        nomeMedicamento: selectedPrescricao.nome_medicamento || '',
        alergiasPaciente: paciente.alergias,
        checkInAtual: paciente.check_in,
        dataHora: dataHoraFixa,
        administradorEmail: user?.email || '',
        isOnline,
        offlineId: offlineIdDaPrescricao
      },
      {
        insertAdministracaoRemote: async (data) => {
          return await supabase.from('historico_administracao').insert(data)
        },
        updateCheckInRemote: async (status) => {
          return await supabase.from('encontristas').update({ check_in: status }).eq('id', paciente.id)
        },
        addToQueue: (item) => {
          queueService.enqueue(item)
        }
      }
    )

    if (result.hasAllergyConflict) {
      setAllergyWarning({
        show: true,
        message: result.allergyMessage || '',
        onConfirm: () => {
          setAllergyWarning(null)
          executarAdministracao()
        }
      })
      setSaving(false)
      return
    }

    if (result.queued) {
      if (!result.tempId) {
        console.error('[ERRO] TempId não retornado no modo offline')
        alert('❌ Erro interno: não foi possível identificar o item offline')
        setSaving(false)
        return
      }
      
      alert('📱 Administração salva offline. Será sincronizada quando a internet voltar.')
      
      const tempId = result.tempId
      const offlineId = result.offlineId || gerarOfflineId().toString()
      const offlineIdNum = offlineIdParaNumero(offlineId)
      const administradorNome = user?.email || 'offline'
      
      const novoHistorico: HistoricoItemComOffline = {
        id: offlineIdNum,
        prescricao_id: selectedPrescricao.id,
        data_hora: dataHoraFixa,
        administrador: administradorNome,
        prescricao: {
          nome_medicamento: selectedPrescricao.nome_medicamento,
          dosagem: selectedPrescricao.dosagem
        },
        _offline: true,
        _tempId: tempId,
        offline_id: offlineId,
        isOffline: true
      } as HistoricoItemComOffline
      
      const novoHistoricoLista = [novoHistorico, ...historico]
      setHistorico(novoHistoricoLista)
      
      const medicacoesAtualizadas = medicacoes.map(med => {
        if (med.id === selectedPrescricao.id) {
          return {
            ...med,
            ultima_administracao: dataHoraFixa,
            isOfflineUpdate: true
          } as PrescricaoComOffline
        }
        return med
      })
      setMedicacoes(medicacoesAtualizadas)
      
      let pacienteAtualizado = paciente
      if (!paciente.check_in) {
        pacienteAtualizado = { ...paciente, check_in: true }
        setPaciente(pacienteAtualizado)
      }
      
      await savePaciente({
        id: paciente.id,
        paciente: { ...pacienteAtualizado },
        medicacoes: [...medicacoesAtualizadas],
        historico: [...novoHistoricoLista]
      })
      
      setIsAdministerModalOpen(false)
      setSelectedPrescricao(null)
    } else if (result.success) {
      setIsAdministerModalOpen(false)
      setSelectedPrescricao(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao registrar administração'}`)
    }

    setSaving(false)
  }, [selectedPrescricao, horaAdministracao, paciente, isOnline, supabase, historico, medicacoes, gerarOfflineId, offlineIdParaNumero, reload])

  // ============================================================
  // HANDLER: DELETAR MEDICAÇÃO (COM OPTIMISTIC UI)
  // ============================================================
  const handleDeletarMedicacao = useCallback(async () => {
    if (!medicationToDelete) return

    setSaving(true)

    const result = await deletarMedicacao(
      {
        medicacaoId: medicationToDelete,
        isOnline
      },
      {
        deleteHistoricoRemote: async (id) => {
          return await supabase.from('historico_administracao').delete().eq('prescricao_id', id)
        },
        deletePrescricaoRemote: async (id) => {
          return await supabase.from('prescricoes').delete().eq('id', id)
        },
        addToQueue: (item) => {
          queueService.enqueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Exclusão salva offline. Será sincronizada quando a internet voltar.')
      
      const novasMedicacoes = medicacoes.filter(m => m.id !== medicationToDelete)
      const novoHistorico = historico.filter(h => h.prescricao_id !== medicationToDelete)
      
      setMedicacoes(novasMedicacoes)
      setHistorico(novoHistorico)
      
      await savePaciente({
        id: paciente.id,
        paciente: { ...paciente },
        medicacoes: [...novasMedicacoes],
        historico: [...novoHistorico]
      })
      
      setMedicationToDelete(null)
    } else if (result.success) {
      setMedicationToDelete(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao excluir medicação'}`)
    }

    setSaving(false)
  }, [medicationToDelete, isOnline, supabase, medicacoes, historico, paciente, reload])

  // ============================================================
  // HANDLER: DELETAR HISTÓRICO (COM OPTIMISTIC UI)
  // ============================================================
  const handleDeletarHistorico = useCallback(async () => {
    if (!historyToDelete) return

    setSaving(true)

    const result = await deletarHistorico(
      {
        historicoId: historyToDelete,
        isOnline
      },
      {
        deleteRemote: async (id) => {
          return await supabase.from('historico_administracao').delete().eq('id', id)
        },
        addToQueue: (item) => {
          queueService.enqueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Exclusão salva offline. Será sincronizada quando a internet voltar.')
      
      const novoHistorico = historico.filter(h => h.id !== historyToDelete)
      setHistorico(novoHistorico)
      
      await savePaciente({
        id: paciente.id,
        paciente: { ...paciente },
        medicacoes: [...medicacoes],
        historico: [...novoHistorico]
      })
      
      setHistoryToDelete(null)
    } else if (result.success) {
      setHistoryToDelete(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao excluir registro'}`)
    }

    setSaving(false)
  }, [historyToDelete, isOnline, supabase, historico, medicacoes, paciente, reload])

  // ============================================================
  // HANDLER: ATUALIZAR PACIENTE (COM OPTIMISTIC UI)
  // ============================================================
  const handleAtualizarPaciente = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)

    const result = await atualizarPaciente(
      {
        pacienteId: paciente.id,
        dados: {
          nome: editNome,
          responsavel: editResponsavel,
          alergias: editAlergias,
          observacoes: editObservacoes
        },
        isOnline
      },
      {
        updateRemote: async (id, data) => {
          return await supabase.from('encontristas').update(data).eq('id', id)
        },
        addToQueue: (item) => {
          queueService.enqueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Dados salvos offline. Serão sincronizados quando a internet voltar.')
      
      const pacienteAtualizado = {
        ...paciente,
        nome: editNome,
        responsavel: editResponsavel,
        alergias: editAlergias,
        observacoes: editObservacoes
      }
      setPaciente(pacienteAtualizado)
      
      await savePaciente({
        id: paciente.id,
        paciente: { ...pacienteAtualizado },
        medicacoes: [...medicacoes],
        historico: [...historico]
      })
      
      setIsEditModalOpen(false)
    } else if (result.success) {
      setIsEditModalOpen(false)
      await reload()
      alert('✅ Dados atualizados com sucesso!')
    } else {
      alert(`❌ ${result.error || 'Erro ao salvar alterações'}`)
    }

    setSaving(false)
  }, [paciente, editNome, editResponsavel, editAlergias, editObservacoes, isOnline, supabase, medicacoes, historico, reload])

  // ============================================================
  // HANDLERS DE FORMULÁRIO (UI)
  // ============================================================
  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 4) v = v.slice(0, 4)
    if (v.length >= 2) {
      const hora = parseInt(v.substring(0, 2))
      if (hora > 23) v = '23' + v.substring(2)
    }
    if (v.length === 4) {
      const minuto = parseInt(v.substring(2, 4))
      if (minuto > 59) v = v.substring(0, 2) + '59'
    }
    if (v.length > 2) {
      v = `${v.slice(0, 2)}:${v.slice(2)}`
    }
    setMedHorario(v)
  }

  const handlePosologiaBlur = () => {
    const val = medPosologia.trim()
    if (!val) return
    if (/^\d+$/.test(val)) {
      setMedPosologia(`${val}h`)
      return
    }
    if (!val.match(/(h|hora)/i) && /\d/.test(val)) {
      setMedPosologia(`${val}h`)
    }
  }

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    setMedNome(valor)
    if (valor.length > 0) {
      const filtrados = baseMedicamentos.filter(m => (m.nome || '').toLowerCase().includes(valor.toLowerCase()))
      setSugestoes(filtrados)
      setMostrarSugestoes(true)
    } else {
      setMostrarSugestoes(false)
    }
  }

  const selecionarMedicamento = (nome: string) => {
    setMedNome(nome)
    setMostrarSugestoes(false)
  }

  const openEditModal = () => {
    setEditNome(paciente.nome || '')
    setEditResponsavel(paciente.responsavel || '')
    setEditAlergias(paciente.alergias || '')
    setEditObservacoes(paciente.observacoes || '')
    setIsEditModalOpen(true)
  }

  // ============================================================
  // EFECTOS
  // ============================================================
  
  useEffect(() => {
    const online = navigator.onLine && !serverOffline
    setIsOnline(online)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [serverOffline])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  // ============================================================
  // RENDER
  // ============================================================
  
  if (shouldLoadFromCache && !initializedFromCache) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  if (isDegradedMode && medicacoes.length === 0 && historico.length === 0 && paciente.nome === 'Carregando...') {
    return (
      <EncontristaView
        paciente={paciente}
        medicacoes={[]}
        historico={[]}
        loading={loading}
        saving={saving}
        infoExpanded={infoExpanded}
        setInfoExpanded={setInfoExpanded}
        isOffline={true}
        isDegradedMode={true}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        medNome={medNome}
        medDosagem={medDosagem}
        setMedDosagem={setMedDosagem}
        medPosologia={medPosologia}
        setMedPosologia={setMedPosologia}
        medHorario={medHorario}
        sugestoes={sugestoes}
        mostrarSugestoes={mostrarSugestoes}
        setMostrarSugestoes={setMostrarSugestoes}
        wrapperRef={wrapperRef}
        isAdministerModalOpen={isAdministerModalOpen}
        setIsAdministerModalOpen={setIsAdministerModalOpen}
        selectedPrescricao={selectedPrescricao}
        horaAdministracao={horaAdministracao}
        setHoraAdministracao={setHoraAdministracao}
        medicationToDelete={medicationToDelete}
        setMedicationToDelete={setMedicationToDelete}
        historyToDelete={historyToDelete}
        setHistoryToDelete={setHistoryToDelete}
        allergyWarning={allergyWarning}
        setAllergyWarning={setAllergyWarning}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editNome={editNome}
        setEditNome={setEditNome}
        editResponsavel={editResponsavel}
        setEditResponsavel={setEditResponsavel}
        editAlergias={editAlergias}
        setEditAlergias={setEditAlergias}
        editObservacoes={editObservacoes}
        setEditObservacoes={setEditObservacoes}
        onAddMedicacao={handleAdicionarMedicacao}
        onAdministrar={handleAdministrarMedicacao}
        onDeleteMedicacao={setMedicationToDelete}
        onDeleteHistory={setHistoryToDelete}
        onConfirmDeleteMedication={handleDeletarMedicacao}
        onConfirmDeleteHistory={handleDeletarHistorico}
        onConfirmAdministracao={executarAdministracao}
        onUpdatePessoa={handleAtualizarPaciente}
        onOpenEditModal={openEditModal}
        onGoBack={goBackWithRefresh}
        getStatus={getStatusMedicacao}
        onNomeChange={handleNomeChange}
        onSelectMedicamento={selecionarMedicamento}
        onHorarioChange={handleHorarioChange}
        onPosologiaBlur={handlePosologiaBlur}
      />
    )
  }

  return (
    <EncontristaView
      paciente={paciente}
      medicacoes={medicacoes}
      historico={historico}
      loading={loading}
      saving={saving}
      infoExpanded={infoExpanded}
      setInfoExpanded={setInfoExpanded}
      isOffline={!isOnline}
      isDegradedMode={isDegradedMode}
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      medNome={medNome}
      medDosagem={medDosagem}
      setMedDosagem={setMedDosagem}
      medPosologia={medPosologia}
      setMedPosologia={setMedPosologia}
      medHorario={medHorario}
      sugestoes={sugestoes}
      mostrarSugestoes={mostrarSugestoes}
      setMostrarSugestoes={setMostrarSugestoes}
      wrapperRef={wrapperRef}
      isAdministerModalOpen={isAdministerModalOpen}
      setIsAdministerModalOpen={setIsAdministerModalOpen}
      selectedPrescricao={selectedPrescricao}
      horaAdministracao={horaAdministracao}
      setHoraAdministracao={setHoraAdministracao}
      medicationToDelete={medicationToDelete}
      setMedicationToDelete={setMedicationToDelete}
      historyToDelete={historyToDelete}
      setHistoryToDelete={setHistoryToDelete}
      allergyWarning={allergyWarning}
      setAllergyWarning={setAllergyWarning}
      isEditModalOpen={isEditModalOpen}
      setIsEditModalOpen={setIsEditModalOpen}
      editNome={editNome}
      setEditNome={setEditNome}
      editResponsavel={editResponsavel}
      setEditResponsavel={setEditResponsavel}
      editAlergias={editAlergias}
      setEditAlergias={setEditAlergias}
      editObservacoes={editObservacoes}
      setEditObservacoes={setEditObservacoes}
      onAddMedicacao={handleAdicionarMedicacao}
      onAdministrar={handleAdministrarMedicacao}
      onDeleteMedicacao={setMedicationToDelete}
      onDeleteHistory={setHistoryToDelete}
      onConfirmDeleteMedication={handleDeletarMedicacao}
      onConfirmDeleteHistory={handleDeletarHistorico}
      onConfirmAdministracao={executarAdministracao}
      onUpdatePessoa={handleAtualizarPaciente}
      onOpenEditModal={openEditModal}
      onGoBack={goBackWithRefresh}
      getStatus={getStatusMedicacao}
      onNomeChange={handleNomeChange}
      onSelectMedicamento={selecionarMedicamento}
      onHorarioChange={handleHorarioChange}
      onPosologiaBlur={handlePosologiaBlur}
    />
  )
}