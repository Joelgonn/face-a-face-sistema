'use client'

import { AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, User, AlertTriangle, Pill, History, UserCheck, 
  ChevronDown, ChevronUp, Clock, CheckCircle2, Pencil, X, 
  Trash2, Loader2, CalendarClock, ThumbsUp, Check, Plus, WifiOff
} from 'lucide-react'
import { FixedSizeList } from 'react-window'

// 🔥 IMPORTANDO TIPOS DO CONTAINER (ÚNICA FONTE DA VERDADE)
import type { Prescricao, HistoricoItem, PrescricaoComOffline, ListaVirtualItem } from './EncontristaContainer'

// --- TIPAGEM LOCAL (apenas o que não vem do Container) ---
type PacienteCompleto = {
  id: number
  nome: string | null
  responsavel: string | null
  alergias: string | null
  observacoes: string | null
  check_in: boolean
}

type MedicamentoBaseRow = {
  id: number
  nome: string | null
}

type StatusMedicacaoCalculado = {
  texto: string
  cor: string
  bg: string
  tipo: 'atrasado' | 'atencao' | 'emdia' | 'sem_dados'
}

type AllergyWarning = {
  show: boolean
  message: string
  onConfirm: () => void
} | null

type GruposMedicacoes = {
  atrasado: Prescricao[]
  atencao: Prescricao[]
  emdia: Prescricao[]
  sem_dados: Prescricao[]
}

type Props = {
  // --- DADOS ---
  paciente: PacienteCompleto
  medicacoes: Prescricao[]
  historico: HistoricoItem[]
  gruposMedicacoes: GruposMedicacoes
  statusMap: Map<number, StatusMedicacaoCalculado>
  // 🔥 NOVA PROP: lista linear para virtualização
  listaVirtualizada: ListaVirtualItem[]
  loading: boolean
  saving: boolean
  infoExpanded: boolean
  setInfoExpanded: (value: boolean) => void

  // --- OFFLINE PROPS ---
  isOffline?: boolean
  isDegradedMode?: boolean

  // --- MODAL DE MEDICAÇÃO ---
  isModalOpen: boolean
  setIsModalOpen: (value: boolean) => void
  medNome: string
  medDosagem: string
  setMedDosagem: (value: string) => void
  medPosologia: string
  setMedPosologia: (value: string) => void
  medHorario: string
  sugestoes: MedicamentoBaseRow[]
  mostrarSugestoes: boolean
  setMostrarSugestoes: (value: boolean) => void
  wrapperRef: React.RefObject<HTMLDivElement>

  // --- MODAL DE ADMINISTRAÇÃO ---
  isAdministerModalOpen: boolean
  setIsAdministerModalOpen: (value: boolean) => void
  selectedPrescricao: Prescricao | null
  horaAdministracao: string
  setHoraAdministracao: (value: string) => void

  // --- MODAIS DE CONFIRMAÇÃO ---
  medicationToDelete: number | null
  setMedicationToDelete: (value: number | null) => void
  historyToDelete: number | null
  setHistoryToDelete: (value: number | null) => void
  allergyWarning: AllergyWarning
  setAllergyWarning: (value: AllergyWarning) => void

  // --- MODAL DE EDIÇÃO ---
  isEditModalOpen: boolean
  setIsEditModalOpen: (value: boolean) => void
  editNome: string
  setEditNome: (value: string) => void
  editResponsavel: string
  setEditResponsavel: (value: string) => void
  editAlergias: string
  setEditAlergias: (value: string) => void
  editObservacoes: string
  setEditObservacoes: (value: string) => void

  // --- HANDLERS ---
  onAddMedicacao: () => void
  onAdministrar: (prescricao: Prescricao) => void
  onDeleteMedicacao: (id: number) => void
  onDeleteHistory: (id: number) => void
  onConfirmDeleteMedication: () => void
  onConfirmDeleteHistory: () => void
  onConfirmAdministracao: () => void
  onUpdatePessoa: (e: React.FormEvent) => Promise<void>
  onOpenEditModal: () => void
  onGoBack: () => void

  // --- FUNÇÕES AUXILIARES (mantidas apenas as não relacionadas a status) ---
  onNomeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSelectMedicamento: (nome: string) => void
  onHorarioChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPosologiaBlur: () => void
}

// --- FUNÇÕES AUXILIARES (UI) ---
const formatarHora = (isoString: string | null) => {
  if (!isoString) return { hora: '--:--', data: '--/--' }
  const data = new Date(isoString)
  return {
    hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    data: data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }
}

const formatarNomeEnfermeiro = (email: string | null) => {
  if (!email) return 'Desconhecido'
  const parteNome = email.split('@')[0]
  const nomeLimpo = parteNome.replace(/[0-9]/g, '').replace(/[._]/g, ' ')
  return nomeLimpo.replace(/\b\w/g, l => l.toUpperCase()).trim()
}

// 🔥 FUNÇÃO DE BADGE DINÂMICO
function getBadgeStatus(tipo: 'atrasado' | 'atencao' | 'emdia' | 'sem_dados') {
  switch (tipo) {
    case 'atrasado':
      return {
        label: 'Atrasado',
        className: 'bg-red-100 text-red-700 border-red-200'
      }
    case 'atencao':
      return {
        label: 'Atenção',
        className: 'bg-amber-100 text-amber-700 border-amber-200'
      }
    case 'emdia':
      return {
        label: 'Em dia',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200'
      }
    case 'sem_dados':
      return {
        label: 'Sem dados',
        className: 'bg-slate-100 text-slate-600 border-slate-200'
      }
  }
}

export function EncontristaView({
  paciente,
  medicacoes,
  historico,
  gruposMedicacoes,
  statusMap,
  listaVirtualizada,
  loading,
  saving,
  infoExpanded,
  setInfoExpanded,
  isOffline = false,
  isDegradedMode = false,
  isModalOpen,
  setIsModalOpen,
  medNome,
  medDosagem,
  setMedDosagem,
  medPosologia,
  setMedPosologia,
  medHorario,
  sugestoes,
  mostrarSugestoes,
  setMostrarSugestoes,
  wrapperRef,
  isAdministerModalOpen,
  setIsAdministerModalOpen,
  selectedPrescricao,
  horaAdministracao,
  setHoraAdministracao,
  medicationToDelete,
  setMedicationToDelete,
  historyToDelete,
  setHistoryToDelete,
  allergyWarning,
  setAllergyWarning,
  isEditModalOpen,
  setIsEditModalOpen,
  editNome,
  setEditNome,
  editResponsavel,
  setEditResponsavel,
  editAlergias,
  setEditAlergias,
  editObservacoes,
  setEditObservacoes,
  onAddMedicacao,
  onAdministrar,
  onDeleteMedicacao,
  onDeleteHistory,
  onConfirmDeleteMedication,
  onConfirmDeleteHistory,
  onConfirmAdministracao,
  onUpdatePessoa,
  onOpenEditModal,
  onGoBack,
  onNomeChange,
  onSelectMedicamento,
  onHorarioChange,
  onPosologiaBlur
}: Props) {

  const showOverlay = loading || saving

  // 🔥 Tela de fallback para modo degradado (offline sem dados)
  if (isDegradedMode && paciente.nome === 'Carregando...') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-amber-700 mb-2">Modo Offline</h2>
          <p className="text-amber-600 mb-4">
            Não foi possível carregar os dados completos do paciente.
            Conecte-se à internet para acessar todas as informações.
          </p>
          <button
            onClick={onGoBack}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  // 🔥 RENDERIZAÇÃO DE UM CARD DE MEDICAÇÃO (Reutilizável)
  const renderMedicacao = (med: Prescricao, tipo: 'atrasado' | 'atencao' | 'emdia' | 'sem_dados') => {
    const statusBase = statusMap.get(med.id)
    const medOffline = med as PrescricaoComOffline

    let statusTexto: string
    let statusCor: string
    if (medOffline.isOfflineUpdate) {
      statusTexto = '✅ Administrado (pendente sync)'
      statusCor = 'text-green-600'
    } else if (medOffline._offline) {
      statusTexto = '⏳ Pendente (offline)'
      statusCor = 'text-yellow-600'
    } else {
      statusTexto = statusBase?.texto || ''
      statusCor = statusBase?.cor || ''
    }

    const badge = getBadgeStatus(tipo)
    
    const highlightClass = {
      atrasado: 'border-l-4 border-l-red-500 bg-red-50 shadow-sm border-t border-r border-b border-red-100',
      atencao: 'border-l-4 border-l-amber-500 bg-amber-50 shadow-sm border-t border-r border-b border-amber-100',
      emdia: 'border-l-4 border-l-emerald-500 bg-emerald-50 shadow-sm border-t border-r border-b border-emerald-100',
      sem_dados: 'border border-slate-200 bg-white shadow-sm'
    }[tipo]

    const isCritical = tipo === 'atrasado' || tipo === 'atencao'
    const isAdministrado = tipo === 'emdia'

    const uniqueKey = (med as PrescricaoComOffline)._tempId || med.id

    return (
      <div key={uniqueKey} className={`p-4 rounded-xl transition-all mb-3 ${highlightClass}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{med.nome_medicamento}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 bg-white/50 px-2 py-0.5 rounded-full border border-slate-100">{med.dosagem}</span>
              <span className="text-xs text-slate-500">{med.posologia}</span>
              <span className="text-xs text-slate-400">Início: {med.horario_inicial}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold border px-2 py-0.5 rounded-md ${badge.className}`}>
                {badge.label}
              </span>
              <span className={`text-xs font-bold ${statusCor}`}>{statusTexto}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => onAdministrar(med)}
              disabled={saving || isAdministrado}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                saving || isAdministrado
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : isCritical 
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
              }`}
              title={isAdministrado ? 'Já administrado hoje' : 'Administrar'}
            >
              {isCritical ? <AlertTriangle size={12} className="inline mr-1" /> : <CheckCircle2 size={12} className="inline mr-1" />}
              <span className="hidden sm:inline">Administrar</span>
              <span className="inline sm:hidden">Ok</span>
            </button>
            <button
              onClick={() => onDeleteMedicacao(med.id)}
              disabled={saving}
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                saving
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title="Excluir medicação"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 🔥 Constantes para virtualização
  const ITEM_HEIGHT = 140 // ajuste fino para compensar mb-3 e garantir altura consistente
  const LIST_HEIGHT = typeof window !== 'undefined' ? window.innerHeight - 320 : 500

  // 🔥 Componente de linha para a lista virtualizada
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = listaVirtualizada[index]

    if (item.type === 'header') {
      const labels = {
        atrasado: { text: '🔴 Atrasados', color: 'text-red-600', bg: 'bg-red-100 text-red-700' },
        atencao: { text: '🟡 Atenção', color: 'text-amber-600', bg: 'bg-amber-100 text-amber-700' },
        emdia: { text: '🟢 Em dia', color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700' },
        sem_dados: { text: '⚪ Sem dados', color: 'text-slate-500', bg: 'bg-slate-100 text-slate-600' }
      }

      const grupo = item.grupo
      const count = gruposMedicacoes[grupo].length
      const label = labels[grupo]

      return (
        <div style={style} className="flex items-center px-2">
          <div className="mt-4 mb-2 flex items-center gap-2">
            <span className={`text-sm font-bold ${label.color}`}>
              {label.text}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${label.bg}`}>
              {count}
            </span>
          </div>
        </div>
      )
    }

    return (
      <div style={style}>
        {renderMedicacao(item.med, item.grupo)}
      </div>
    )
  }

  // 🔥 ESTRUTURA PRINCIPAL - COM DIV RAIZ ÚNICA
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* OVERLAY DE LOADING */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-sm font-medium text-slate-700">Processando...</span>
          </div>
        </div>
      )}

      {/* OFFLINE BANNER */}
      {isOffline && !isDegradedMode && (
        <div className="sticky top-0 z-30 bg-amber-500 text-white text-sm py-2 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>Modo offline - Você está desconectado. As alterações serão sincronizadas quando a internet voltar.</span>
        </div>
      )}

      {/* HEADER */}
      <div
        className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100"
        style={{ top: isOffline && !isDegradedMode ? '40px' : '0px' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onGoBack}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold text-slate-800">
                {paciente.nome}
              </h1>
              <p className="text-xs text-slate-500">
                ID: {paciente.id} • {paciente.check_in ? 'Presente' : 'Ausente'}
              </p>
            </div>

            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${paciente.check_in ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {paciente.check_in ? <UserCheck size={14} className="inline mr-1" /> : null}
              {paciente.check_in ? 'Presente' : 'Ausente'}
            </div>

            <button
              onClick={onOpenEditModal}
              disabled={saving}
              className={`p-2 rounded-xl transition-colors ${
                saving 
                  ? 'text-slate-300 cursor-not-allowed' 
                  : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'
              }`}
              title="Editar paciente"
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* INFORMAÇÕES DO PACIENTE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => setInfoExpanded(!infoExpanded)}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white">
                <User size={24} />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-slate-800">{paciente.nome}</h2>
                <p className="text-sm text-slate-500">Responsável: {paciente.responsavel || 'Não informado'}</p>
              </div>
            </div>
            {infoExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          <AnimatePresence>
            {infoExpanded && (
              <div className="border-t border-slate-100">
                <div className="p-5 space-y-4">
                  {paciente.alergias && (
                    <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Alergias / Atenção</p>
                        <p className="text-sm font-semibold text-rose-700">{paciente.alergias}</p>
                      </div>
                    </div>
                  )}

                  {paciente.observacoes && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Observações</p>
                        <p className="text-sm font-medium text-amber-700">{paciente.observacoes}</p>
                      </div>
                    </div>
                  )}

                  {!paciente.alergias && !paciente.observacoes && (
                    <p className="text-slate-400 text-sm italic text-center py-4">Nenhuma informação adicional cadastrada.</p>
                  )}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* MEDICAÇÕES COM VIRTUALIZAÇÃO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Pill className="text-orange-500" size={20} />
              Medicações
              <span className="text-xs text-slate-400 font-normal ml-2">({medicacoes.length})</span>
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50 ${
                saving 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
              title="Adicionar medicação"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {medicacoes.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-8">Nenhuma medicação cadastrada.</p>
          ) : (
            <FixedSizeList
              height={LIST_HEIGHT}
              width="100%"
              itemCount={listaVirtualizada.length}
              itemSize={ITEM_HEIGHT}
              overscanCount={5}
            >
              {Row}
            </FixedSizeList>
          )}
        </div>

        {/* HISTÓRICO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <History className="text-blue-500" size={20} />
            Histórico de Administração
            <span className="text-xs text-slate-400 font-normal ml-2">({historico.length})</span>
          </h2>

          {historico.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-8">Nenhum registro de administração ainda.</p>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-100 rounded-full"></div>
              {historico.map((item) => {
                const { hora, data } = formatarHora(item.data_hora)
                return (
                  <div
                    key={item.id}
                    className="relative pl-8 group"
                  >
                    <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center z-10 shadow-sm">
                      <Check size={10} className="text-emerald-700" />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">
                            {item.prescricao?.nome_medicamento || 'Medicação excluída'}
                          </p>
                          <p className="text-xs text-slate-500">{item.prescricao?.dosagem}</p>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <User size={10} />
                            {formatarNomeEnfermeiro(item.administrador)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{hora}</p>
                            <p className="text-[10px] text-slate-400">{data}</p>
                          </div>
                          <button
                            onClick={() => onDeleteHistory(item.id)}
                            disabled={saving}
                            className={`p-1 rounded transition-colors disabled:opacity-50 ${
                              saving
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title="Excluir registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAIS (TODOS FORA DO CONTEÚDO PRINCIPAL, DENTRO DA DIV RAIZ) */}
      {/* ============================================================ */}

      {/* MODAL NOVA MEDICAÇÃO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="p-5 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-xl font-black text-orange-600">Nova Medicação</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18}/></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="relative" ref={wrapperRef}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Medicamento *</label>
                  <input
                    type="text"
                    required
                    value={medNome}
                    onChange={onNomeChange}
                    onFocus={() => { if(medNome) setMostrarSugestoes(true); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                    placeholder="Digite para buscar..."
                    autoFocus
                    autoComplete="off"
                  />
                  {mostrarSugestoes && sugestoes.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-slate-100 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg py-1">
                      {sugestoes.map(sugestao => (
                        <li
                          key={sugestao.id}
                          onClick={() => onSelectMedicamento(sugestao.nome || '')}
                          className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-slate-700 text-sm border-b border-slate-50 last:border-none transition-colors"
                        >
                          {sugestao.nome}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosagem *</label>
                    <input
                      type="text"
                      required
                      value={medDosagem}
                      onChange={e => setMedDosagem(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                      placeholder="Ex: 500mg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário *</label>
                    <input
                      type="text"
                      required
                      value={medHorario}
                      onChange={onHorarioChange}
                      placeholder="HH:MM"
                      maxLength={5}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 text-center font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Posologia *</label>
                  <input
                    type="text"
                    required
                    value={medPosologia}
                    onChange={e => setMedPosologia(e.target.value)}
                    onBlur={onPosologiaBlur}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    placeholder="Ex: 8/8h"
                  />
                </div>
                <button
                  onClick={onAddMedicacao}
                  disabled={saving}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 size={16} />}
                  Salvar Medicação
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMAR ADMINISTRAÇÃO */}
      <AnimatePresence>
        {isAdministerModalOpen && selectedPrescricao && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Confirmar Dose</h2>
              <p className="text-slate-500 text-sm mb-6">
                Administrar <strong className="text-emerald-600">{selectedPrescricao.nome_medicamento}</strong> agora?
              </p>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Horário Realizado</label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={horaAdministracao}
                    onChange={e => setHoraAdministracao(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xl font-bold text-slate-800 tracking-wider"
                  />
                  <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                    <CalendarClock size={20} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAdministerModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmAdministracao}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 size={16} />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EXCLUIR MEDICAÇÃO */}
      <AnimatePresence>
        {medicationToDelete !== null && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-rose-100">
              <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-rose-500 w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-rose-700 mb-2">Excluir Medicação?</h2>
              <p className="text-slate-500 text-sm mb-6">Isso removerá a prescrição e todo o histórico de administração.</p>
              <div className="flex gap-3">
                <button onClick={() => setMedicationToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={onConfirmDeleteMedication} disabled={saving} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-md hover:bg-rose-700 transition-all disabled:opacity-50">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EXCLUIR HISTÓRICO */}
      <AnimatePresence>
        {historyToDelete !== null && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-amber-100">
              <div className="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <History className="text-amber-500 w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-amber-700 mb-2">Desfazer Registro?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Você está prestes a apagar <strong>apenas este registro</strong> de administração. O medicamento continuará na lista.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setHistoryToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={onConfirmDeleteHistory} disabled={saving} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold shadow-md hover:bg-amber-700 transition-all disabled:opacity-50">Apagar Registro</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ALERTA DE ALERGIA */}
      <AnimatePresence>
        {allergyWarning && (
          <div className="fixed inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border-4 border-red-100">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <AlertTriangle className="text-red-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-red-600 mb-2">ATENÇÃO!</h2>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                <p className="text-slate-600 font-medium mb-1 text-sm">O sistema detectou um conflito</p>
                <p className="text-lg font-bold text-red-800 uppercase break-words">{allergyWarning.message}</p>
              </div>
              <p className="text-xs text-slate-400 mb-6 px-2 leading-relaxed">
                * Este alerta é automático e baseado em texto. <strong>Sempre verifique a ficha clínica e consulte o responsável de saúde.</strong>
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={allergyWarning.onConfirm}
                  disabled={saving}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-md hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ThumbsUp size={18} /> Sim, estou ciente
                </button>
                <button onClick={() => setAllergyWarning(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDITAR PACIENTE */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="p-5 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-xl font-black text-orange-600">Editar Dados</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18}/></button>
              </div>
              <form onSubmit={onUpdatePessoa} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                  <input type="text" required value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label>
                    <input type="text" value={editResponsavel} onChange={e => setEditResponsavel(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-500 uppercase mb-1">Alergias</label>
                    <input type="text" value={editAlergias} onChange={e => setEditAlergias(e.target.value)} className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 text-rose-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                  <textarea rows={3} value={editObservacoes} onChange={e => setEditObservacoes(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" />
                </div>
                <button type="submit" disabled={saving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 size={16} />}
                  Salvar Alterações
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}