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
import { Database } from '@/types/supabase'

// --- TIPAGEM ---
type EncontristaRow = Database['public']['Tables']['encontristas']['Row']
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row']
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row']
type MedicamentoBaseRow = Database['public']['Tables']['medicamentos']['Row']

// --- TIPO CORRETO PARA HISTÓRICO NA UI (prescricao_id NÃO pode ser null) ---
export type HistoricoItem = HistoricoRow & {
  prescricao_id: number
  prescricao: { nome_medicamento: string | null; dosagem: string | null } | null
}

type PacienteCompleto = EncontristaRow & {
  prescricoes: PrescricaoRow[]
  historico: HistoricoItem[]
}

type Props = {
  paciente: PacienteCompleto
  baseMedicamentos: MedicamentoBaseRow[]
}

// --- TYPE GUARD: verifica se o histórico é válido (prescricao_id não é null) ---
function isHistoricoValido(
  h: HistoricoRow & { prescricao: { nome_medicamento: string | null; dosagem: string | null } | null }
): h is HistoricoItem {
  return h.prescricao_id !== null
}

// --- FUNÇÕES AUXILIARES DE FILA OFFLINE ---
const getQueue = () => {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('offlineQueue') || '[]')
}

const saveQueue = (queue: unknown[]) => {
  localStorage.setItem('offlineQueue', JSON.stringify(queue))
}

const addToQueue = (item: unknown) => {
  const queue = getQueue()
  queue.push(item)
  saveQueue(queue)
}

export function EncontristaContainer({ paciente: pacienteInicial, baseMedicamentos }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // --- STATE ---
  const [paciente, setPaciente] = useState<PacienteCompleto>(pacienteInicial)
  const [medicacoes, setMedicacoes] = useState(pacienteInicial.prescricoes || [])
  const [historico, setHistorico] = useState<HistoricoItem[]>(
    pacienteInicial.historico.filter(isHistoricoValido)
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

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
  const [selectedPrescricao, setSelectedPrescricao] = useState<PrescricaoRow | null>(null)
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

  // --- DETECTAR ONLINE/OFFLINE ---
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // --- RELOAD (centralizado) ---
  const reload = useCallback(async () => {
    setLoading(true)

    // Buscar pessoa atualizada (apenas dados básicos)
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

    // Buscar medicações
    const { data: medData } = await supabase
      .from('prescricoes')
      .select('*')
      .eq('encontrista_id', paciente.id)
      .order('id', { ascending: true })

    if (medData) {
      setMedicacoes(medData)

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

        const historicoFiltrado = (histData || []).filter(isHistoricoValido)
        setHistorico(historicoFiltrado)
      } else {
        setHistorico([])
      }
    }

    setLoading(false)
  }, [paciente.id, supabase])

  // --- FUNÇÃO PARA VOLTAR COM REFRESH (EVENTO PERSONALIZADO) ---
  const goBackWithRefresh = useCallback(() => {
    window.dispatchEvent(new Event('dashboard-refresh'))
    router.push('/dashboard')
  }, [router])

  // --- HANDLER: ADICIONAR MEDICAÇÃO ---
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
        isOnline
      },
      {
        insertRemote: async (data) => {
          return await supabase.from('prescricoes').insert(data)
        },
        addToQueue: (item) => {
          addToQueue(item)
        }
      }
    )

    if (result.success || result.queued) {
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
  }, [medNome, medDosagem, medPosologia, medHorario, paciente.id, paciente.alergias, isOnline, supabase, reload])

  const handleAdicionarMedicacao = useCallback(async () => {
    if (medHorario.length !== 5 || !medHorario.includes(':')) {
      alert("⚠️ Horário inválido. Use formato HH:MM")
      return
    }

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
        isOnline
      },
      {
        insertRemote: async (data) => {
          return await supabase.from('prescricoes').insert(data)
        },
        addToQueue: (item) => {
          addToQueue(item)
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
      alert('📱 Medicação salva localmente. Será sincronizada quando a internet voltar.')
      setMedNome('')
      setMedDosagem('')
      setMedPosologia('')
      setMedHorario('')
      setIsModalOpen(false)
      await reload()
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
  }, [medNome, medDosagem, medPosologia, medHorario, paciente.id, paciente.alergias, isOnline, supabase, reload, executarAdicionarMedicacao])

  // --- HANDLER: ADMINISTRAR MEDICAÇÃO ---
  const handleAdministrarMedicacao = useCallback(async (prescricao: PrescricaoRow) => {
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

    const result = await administrarMedicacao(
      {
        prescricaoId: selectedPrescricao.id,
        nomeMedicamento: selectedPrescricao.nome_medicamento || '',
        alergiasPaciente: paciente.alergias,
        checkInAtual: paciente.check_in,
        dataHora: dataHoraFixa,
        administradorEmail: user?.email || '',
        isOnline
      },
      {
        insertAdministracaoRemote: async (data) => {
          return await supabase.from('historico_administracao').insert(data)
        },
        updateCheckInRemote: async (status) => {
          return await supabase.from('encontristas').update({ check_in: status }).eq('id', paciente.id)
        },
        addToQueue: (item) => {
          addToQueue(item)
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
      alert('📱 Administração salva localmente. Será sincronizada quando a internet voltar.')
      setIsAdministerModalOpen(false)
      setSelectedPrescricao(null)
      await reload()
    } else if (result.success) {
      setIsAdministerModalOpen(false)
      setSelectedPrescricao(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao registrar administração'}`)
    }

    setSaving(false)
  }, [selectedPrescricao, horaAdministracao, paciente.alergias, paciente.check_in, paciente.id, isOnline, supabase, reload])

  // --- HANDLER: DELETAR MEDICAÇÃO ---
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
          addToQueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Exclusão salva localmente. Será sincronizada quando a internet voltar.')
      setMedicationToDelete(null)
      await reload()
    } else if (result.success) {
      setMedicationToDelete(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao excluir medicação'}`)
    }

    setSaving(false)
  }, [medicationToDelete, isOnline, supabase, reload])

  // --- HANDLER: DELETAR HISTÓRICO ---
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
          addToQueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Exclusão salva localmente. Será sincronizada quando a internet voltar.')
      setHistoryToDelete(null)
      await reload()
    } else if (result.success) {
      setHistoryToDelete(null)
      await reload()
    } else {
      alert(`❌ ${result.error || 'Erro ao excluir registro'}`)
    }

    setSaving(false)
  }, [historyToDelete, isOnline, supabase, reload])

  // --- HANDLER: ATUALIZAR PACIENTE ---
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
          addToQueue(item)
        }
      }
    )

    if (result.queued) {
      alert('📱 Dados salvos localmente. Serão sincronizados quando a internet voltar.')
      setIsEditModalOpen(false)
      await reload()
    } else if (result.success) {
      setIsEditModalOpen(false)
      await reload()
      alert('✅ Dados atualizados com sucesso!')
    } else {
      alert(`❌ ${result.error || 'Erro ao salvar alterações'}`)
    }

    setSaving(false)
  }, [paciente.id, editNome, editResponsavel, editAlergias, editObservacoes, isOnline, supabase, reload])

  // --- HANDLERS DE FORMULÁRIO (UI) ---
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

  // --- CLICK OUTSIDE PARA SUGESTÕES ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

    // --- VIEW ---
  return (
    <EncontristaView
      // DADOS
      paciente={paciente}
      medicacoes={medicacoes}
      historico={historico}
      loading={loading}
      saving={saving}
      infoExpanded={infoExpanded}
      setInfoExpanded={setInfoExpanded}

      // MODAL MEDICAÇÃO
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

      // MODAL ADMINISTRAÇÃO
      isAdministerModalOpen={isAdministerModalOpen}
      setIsAdministerModalOpen={setIsAdministerModalOpen}
      selectedPrescricao={selectedPrescricao}
      horaAdministracao={horaAdministracao}
      setHoraAdministracao={setHoraAdministracao}

      // MODAIS CONFIRMAÇÃO
      medicationToDelete={medicationToDelete}
      setMedicationToDelete={setMedicationToDelete}
      historyToDelete={historyToDelete}
      setHistoryToDelete={setHistoryToDelete}
      allergyWarning={allergyWarning}
      setAllergyWarning={setAllergyWarning}

      // MODAL EDIÇÃO
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

      // HANDLERS
      onAddMedicacao={handleAdicionarMedicacao}
      onAdministrar={(p) => handleAdministrarMedicacao(p as PrescricaoRow)}
      onDeleteMedicacao={setMedicationToDelete}
      onDeleteHistory={setHistoryToDelete}
      onConfirmDeleteMedication={handleDeletarMedicacao}
      onConfirmDeleteHistory={handleDeletarHistorico}
      onConfirmAdministracao={executarAdministracao}
      onUpdatePessoa={handleAtualizarPaciente}
      onOpenEditModal={openEditModal}
      onGoBack={goBackWithRefresh}

      // FUNÇÕES AUXILIARES
      getStatus={calcularStatusMedicacao}
      onNomeChange={handleNomeChange}
      onSelectMedicamento={selecionarMedicamento}
      onHorarioChange={handleHorarioChange}
      onPosologiaBlur={handlePosologiaBlur}
    />
  )
}