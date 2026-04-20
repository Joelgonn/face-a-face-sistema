'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/app/utils/supabase/client';
import { zerarSistemaCompleto } from '@/app/actions/system';
import { Database } from '@/types/supabase'; 
import { 
  LogOut, Plus, Search, AlertCircle, Save, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Pill, Trash2, AlertTriangle, Shield,
  FileText, CheckCircle2, FileSpreadsheet, Activity, ChevronDown,
  RefreshCw, RotateCcw, Cloud
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Papa from 'papaparse'; 

// --- FUNÇÃO SAFE QUERY (VERSÃO SEM ANY) ---
async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn()
    
    // Verifica se é uma resposta do Supabase com erro
    if (result && typeof result === 'object') {
      const possibleError = result as { error?: { message: string } }
      if (possibleError.error) {
        throw possibleError.error
      }
    }
    
    return result
  } catch (err) {
    console.error('🔥 Erro crítico:', err)
    alert('Erro de conexão. Clique em "Recarregar Sistema".')
    return null
  }
}

// --- OFFLINE QUEUE (localStorage) ---
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

// --- TIPAGEM AVANÇADA ---
type EncontristaRow = Database['public']['Tables']['encontristas']['Row'];
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row'];
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row'];

export type EncontristaDashboard = EncontristaRow & {
  prescricoes: (Pick<PrescricaoRow, 'id' | 'posologia' | 'horario_inicial'> & {
    historico_administracao: Pick<HistoricoRow, 'data_hora'>[]
  })[]
};

interface ToastNotification {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

interface DashboardClientProps {
  initialEncontristas: EncontristaDashboard[];
  isAdminInitial: boolean;
}

interface OfflineQueueItem {
  tipo: 'novo' | 'checkin';
  dados?: {
    nome: string;
    responsavel: string;
    alergias: string;
    observacoes: string;
    check_in: boolean;
  };
  id?: number;
  status?: boolean;
}

export default function DashboardClient({ 
  initialEncontristas, 
  isAdminInitial 
}: DashboardClientProps) {
  
  const [encontristas, setEncontristas] = useState<EncontristaDashboard[]>(initialEncontristas);
  const [isAdmin] = useState(isAdminInitial);
  const [loading, setLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  
  const [importing, setImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [novasAlergias, setNovasAlergias] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [checkInTarget, setCheckInTarget] = useState<{id: number, status: boolean, nome: string} | null>(null);

  // --- ESTADO MODO EMERGÊNCIA ---
  const [modoEmergencia, setModoEmergencia] = useState(false);
  
  // --- ESTADO DE CONEXÃO ---
  const [isOnline, setIsOnline] = useState(true);
  
  // --- CONTADOR DA FILA OFFLINE ---
  const [queueCount, setQueueCount] = useState(0);
  
  // --- MODAL DE PENDÊNCIAS ---
  const [showQueue, setShowQueue] = useState(false);
  
  // --- MODO SIMPLES (ATIVADO POR PADRÃO PARA EVENTO) ---
  const [modoSimples, setModoSimples] = useState(true);
  
  // --- MENU MOBILE ---
  const [openMenu, setOpenMenu] = useState(false);
  
  // --- FEEDBACK VISUAL (FLASH VERDE) ---
  const [flashId, setFlashId] = useState<number | null>(null);
  
  // --- FAB EXPANDIDO ---
  const [fabOpen, setFabOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const updateQueueCount = useCallback(() => {
    const q = getQueue()
    setQueueCount(q.length)
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000); 
  }, []);

  const totalEncontristas = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalEncontristas - totalPresentes;

  // --- AUTO-FOCO NO INPUT QUANDO MODO SIMPLES ESTIVER ATIVO ---
  useEffect(() => {
    if (modoSimples && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modoSimples])

  // --- BUSCAR ENCONTRISTAS COM SAFE QUERY ---
  const buscarEncontristas = useCallback(async () => {
    setLoading(true);

    const result = await safeQuery(async () => {
      return await supabase
        .from('encontristas')
        .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
        .order('nome', { ascending: true })
    });

    if (result?.data) {
      setEncontristas((result.data as unknown) as EncontristaDashboard[] || []);
    }

    setLoading(false);
  }, [supabase]);

  // --- FUNÇÃO DE SINCRONIZAÇÃO INTELIGENTE (ITEM POR ITEM) ---
  const syncOfflineData = useCallback(async () => {
    const queue = getQueue() as OfflineQueueItem[]
    if (queue.length === 0) {
      showToast('warning', 'Sincronização', 'Nenhum dado pendente')
      return
    }

    const novaFila: OfflineQueueItem[] = []
    let sucessos = 0

    showToast('warning', 'Sincronizando...', `${queue.length} itens pendentes`)

    for (const item of queue) {
      try {
        if (item.tipo === 'novo' && item.dados) {
          const { error } = await supabase.from('encontristas').insert(item.dados)
          if (error) throw error
          sucessos++
        }

        if (item.tipo === 'checkin' && item.id !== undefined && item.status !== undefined) {
          const { error } = await supabase
            .from('encontristas')
            .update({ check_in: item.status })
            .eq('id', item.id)

          if (error) throw error
          sucessos++
        }

      } catch (err) {
        console.error('Erro ao sincronizar item:', err, item)
        novaFila.push(item)
      }
    }

    saveQueue(novaFila)
    updateQueueCount()

    await buscarEncontristas()

    if (novaFila.length === 0) {
      showToast('success', 'Sincronização completa', `${sucessos} itens enviados com sucesso`)
    } else {
      showToast('warning', 'Sincronização parcial', `${novaFila.length} itens ainda pendentes`)
    }
  }, [supabase, buscarEncontristas, showToast, updateQueueCount])

  // --- DETECTAR ONLINE/OFFLINE ---
  useEffect(() => {
    setIsOnline(navigator.onLine)
    updateQueueCount()

    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }

    const handleOffline = () => {
      setIsOnline(false)
      showToast('warning', 'Sem internet', 'Modo offline ativado. Dados serão salvos localmente.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncOfflineData, updateQueueCount, showToast])

  // --- AUTO-RETRY A CADA 30 SEGUNDOS ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        const queue = getQueue()
        if (queue.length > 0) {
          syncOfflineData()
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [syncOfflineData])

  // --- EVENTO DE SYNC DO SERVICE WORKER (PWA) ---
  useEffect(() => {
    const handleSyncFromSW = () => {
      console.log('[PWA] Sincronizando dados offline via Service Worker')
      syncOfflineData()
    }
    
    window.addEventListener('sync-offline-data', handleSyncFromSW)
    
    return () => {
      window.removeEventListener('sync-offline-data', handleSyncFromSW)
    }
  }, [syncOfflineData])

  // --- RELOAD DE DADOS ---
  const reloadData = async () => {
    await buscarEncontristas()
    showToast('success', 'Atualizado', 'Dados sincronizados com o servidor')
  }

  // --- HARD RELOAD (RECARREGAR SISTEMA COMPLETO) ---
  const hardReload = () => {
    window.location.reload()
  }

  const getStatusPessoa = (pessoa: EncontristaDashboard) => {
    if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) {
      return { 
        cor: 'bg-slate-100 text-slate-700 border-slate-200', 
        bordaL: 'border-l-slate-300',
        texto: 'Sem Meds', prioridade: 0, icone: <Activity size={12}/> 
      };
    }
    
    let statusGeral = 3; 
    
    for (const med of pessoa.prescricoes) {
      if (!med.posologia || !med.horario_inicial) continue;

      const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
      if (!match) continue; 
      
      const intervaloHoras = parseInt(match[1]);
      const historico = med.historico_administracao?.sort((a, b) => 
        new Date(b.data_hora as string).getTime() - new Date(a.data_hora as string).getTime()
      );
      const ultimoRegistro = historico?.[0];
      
      const dataBase = ultimoRegistro?.data_hora 
        ? new Date(new Date(ultimoRegistro.data_hora as string).getTime() + intervaloHoras * 60 * 60 * 1000)
        : (() => {
            const [hora, minuto] = med.horario_inicial.split(':').map(Number);
            const hoje = new Date();
            return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
          })();

      const diffMinutos = (dataBase.getTime() - new Date().getTime()) / 1000 / 60;
      
      if (diffMinutos < 0) { statusGeral = 1; break; } 
      else if (diffMinutos < 30) { statusGeral = Math.min(statusGeral, 2); } 
    }

    if (statusGeral === 1) return { cor: 'bg-rose-100 text-rose-800 border-rose-200', bordaL: 'border-l-rose-500', texto: 'Atrasado', prioridade: 3, icone: <AlertTriangle size={12}/> };
    if (statusGeral === 2) return { cor: 'bg-amber-100 text-amber-800 border-amber-200', bordaL: 'border-l-amber-500', texto: 'Atenção', prioridade: 2, icone: <Clock size={12}/> };
    return { cor: 'bg-emerald-100 text-emerald-800 border-emerald-200', bordaL: 'border-l-emerald-500', texto: 'Em Dia', prioridade: 1, icone: <CheckCircle2 size={12}/> };
  };

  const requestCheckIn = (id: number, currentStatus: boolean | null, nome: string) => {
    setCheckInTarget({ id, status: currentStatus || false, nome });
  };

  const confirmCheckIn = async () => {
    if (!checkInTarget) return;
    
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada')
      return
    }

    const { id, status } = checkInTarget;
    const novoStatus = !status;
    
    setFlashId(id)
    setTimeout(() => setFlashId(null), 300)
    
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    if (!navigator.onLine) {
      addToQueue({
        tipo: 'checkin',
        id: id,
        status: novoStatus
      } as OfflineQueueItem)
      updateQueueCount()
      
      setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: novoStatus } : p));
      setCheckInTarget(null);
      showToast('warning', 'Offline', 'Check-in salvo localmente. Será sincronizado quando a internet voltar.')
      return
    }
    
    const backup = [...encontristas];
    setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: novoStatus } : p));
    setCheckInTarget(null);
    
    const { error } = await supabase.from('encontristas').update({ check_in: novoStatus }).eq('id', id);
    
    if (error) {
      setEncontristas(backup);
      showToast('error', 'Erro de conexão', 'Clique em "Recarregar Sistema"');
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada')
      return
    }
    
    if (!novoNome.trim()) {
        showToast('warning', 'Atenção', 'O nome do encontrista é obrigatório.');
        return;
    }
    
    if (!navigator.onLine) {
      addToQueue({
        tipo: 'novo',
        dados: {
          nome: novoNome,
          responsavel: novoResponsavel,
          alergias: novasAlergias,
          observacoes: novasObservacoes,
          check_in: false
        }
      } as OfflineQueueItem)
      updateQueueCount()
      
      showToast('warning', 'Offline', 'Paciente salvo localmente. Será sincronizado quando a internet voltar.')
      setNovoNome('')
      setNovoResponsavel('')
      setNovasAlergias('')
      setNovasObservacoes('')
      setIsModalOpen(false)
      return
    }
    
    setSaving(true);
    
    const { error } = await supabase.from('encontristas').insert({ 
      nome: novoNome, 
      responsavel: novoResponsavel, 
      alergias: novasAlergias, 
      observacoes: novasObservacoes, 
      check_in: false 
    });

    if (!error) {
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes(''); 
      setIsModalOpen(false); 
      showToast('success', 'Cadastrado!', `${novoNome} adicionado.`);
      buscarEncontristas();
    } else {
      showToast('error', 'Erro de conexão', 'Clique em "Recarregar Sistema"');
    }
    setSaving(false);
  };

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada')
      return
    }
    
    setResetError(null);
    setIsResetting(true);
    const resultado = await zerarSistemaCompleto(resetPassword);
    if (resultado.success) {
      localStorage.removeItem('offlineQueue');
      updateQueueCount();
      await buscarEncontristas();
      setIsResetModalOpen(false);
      setResetPassword('');
      showToast('success', 'Sistema Zerado', 'Dados limpos com sucesso.');
    } else {
      setResetError(resultado.message);
    }
    setIsResetting(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada')
      return
    }
    
    const file = event.target.files?.[0];
    if (file) { setFileToImport(file); setIsImportConfirmOpen(true); }
    event.target.value = '';
  };

  // --- IMPORTAÇÃO CSV CORRIGIDA (TUDO OU NADA COM SAFE QUERY) ---
  const processFileImport = () => {
    if (!fileToImport) return;
    setImporting(true);
    Papa.parse(fileToImport, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const registros: {
          nome: string;
          alergias: string | null;
          observacoes: string | null;
          responsavel: string | null;
          check_in: boolean;
        }[] = [];
        
        for (const parts of results.data as string[][]) {
          if (parts.length >= 2 && !(parts[0] && parts[0].trim().startsWith('#'))) {
            const nome = parts[1]?.trim();
            if (nome) {
              registros.push({
                nome: nome,
                alergias: parts[2]?.trim() || null,
                observacoes: parts[3]?.trim() || null,
                responsavel: parts[4]?.trim() || null,
                check_in: false
              });
            }
          }
        }
        
        if (registros.length === 0) {
          showToast('warning', 'Atenção', 'Nenhum registro válido encontrado no arquivo.');
          setImporting(false);
          setIsImportConfirmOpen(false);
          setFileToImport(null);
          return;
        }
        
        const result = await safeQuery(async () =>
          await supabase.from('encontristas').insert(registros)
        );
        
        if (result) {
          showToast('success', 'Importação Concluída', `${registros.length} registros importados.`);
          await buscarEncontristas();
        } else {
          showToast('error', 'Falha na Importação', 'Nenhum dado foi importado. Clique em "Recarregar Sistema".');
        }
        
        setImporting(false);
        setIsImportConfirmOpen(false);
        setFileToImport(null);
      },
      error: () => {
        showToast('error', 'Erro de Leitura', 'Falha na leitura do arquivo. Clique em "Recarregar Sistema".');
        setImporting(false);
      }
    });
  };

  const filtered = encontristas.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nome = p.nome || '';
    const responsavel = p.responsavel || '';
    return nome.toLowerCase().includes(term) || responsavel.toLowerCase().includes(term) || (term && p.id === Number(term));
  });

  const sorted = [...filtered].sort((a, b) => getStatusPessoa(b).prioridade - getStatusPessoa(a).prioridade);

  const getConnectionStatus = () => {
    if (!isOnline) return { text: '🔴 Offline', bg: 'bg-rose-100 text-rose-700' }
    if (queueCount > 0) return { text: '🟡 Pendente', bg: 'bg-amber-100 text-amber-700' }
    return { text: '🟢 Online', bg: 'bg-emerald-100 text-emerald-700' }
  }

  const connectionStatus = getConnectionStatus()

  const handleSwipeCheckIn = async (id: number, currentStatus: boolean | null, nome: string) => {
    requestCheckIn(id, currentStatus, nome)
    setTimeout(() => {
      confirmCheckIn()
    }, 100)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <Image src="/favicon.ico" alt="Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-sm" />
             <h1 className="text-xl md:text-2xl font-black text-orange-600 flex items-center gap-2">
               Face a Face <span className="hidden sm:inline-block text-[10px] font-black tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full uppercase">Igreja Batista Apascentar</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setModoSimples(prev => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              {modoSimples ? '📱 Simples' : '🖥️ Completo'}
            </button>

            {!modoSimples && (
              <div className={`hidden sm:block px-3 py-1.5 rounded-full text-xs font-bold ${connectionStatus.bg}`}>
                {connectionStatus.text}
              </div>
            )}

            {!modoSimples && (
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(!openMenu)}
                  className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ☰
                </button>

                <AnimatePresence>
                  {openMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50"
                    >
                      <button 
                        onClick={() => { reloadData(); setOpenMenu(false); }} 
                        className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3"
                      >
                        <RefreshCw size={18} className="text-slate-600" />
                        Recarregar Dados
                      </button>
                      <button 
                        onClick={() => { hardReload(); setOpenMenu(false); }} 
                        className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3"
                      >
                        <RotateCcw size={18} className="text-slate-600" />
                        Recarregar Sistema
                      </button>
                      <button 
                        onClick={() => { setModoEmergencia(!modoEmergencia); setOpenMenu(false); }} 
                        className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3"
                      >
                        <AlertTriangle size={18} className="text-amber-600" />
                        Modo Emergência {modoEmergencia && '(Ativo)'}
                      </button>
                      <button 
                        onClick={() => { setShowQueue(true); setOpenMenu(false); }} 
                        className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3"
                      >
                        <Cloud size={18} className="text-slate-600" />
                        Pendências ({queueCount})
                      </button>
                      
                      {isAdmin && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          <Link href="/dashboard/relatorio" onClick={() => setOpenMenu(false)} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3">
                            <FileText size={18} className="text-slate-600" />
                            Relatório
                          </Link>
                          <Link href="/dashboard/equipe" onClick={() => setOpenMenu(false)} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3">
                            <Shield size={18} className="text-slate-600" />
                            Equipe
                          </Link>
                          <Link href="/dashboard/medicamentos" onClick={() => setOpenMenu(false)} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-95 transition-all text-base font-semibold text-slate-800 flex items-center gap-3">
                            <Pill size={18} className="text-slate-600" />
                            Farmácia
                          </Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                <LogOut size={22}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {!modoSimples && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                  onClick={() => setShowStats(!showStats)} 
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                  <div className="flex items-center gap-3">
                      <Activity className="text-orange-500 w-5 h-5" />
                      <span className="font-bold text-slate-700">Visão Geral</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                      {!showStats && (
                          <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">Inscritos: <span className="text-slate-700 text-xs ml-1">{totalEncontristas}</span></span>
                              <span className="text-emerald-500">Presentes: <span className="text-emerald-600 text-xs ml-1">{totalPresentes}</span></span>
                              <span className="text-rose-500">Ausentes: <span className="text-rose-600 text-xs ml-1">{totalAusentes}</span></span>
                          </div>
                      )}
                      <ChevronDown className={`text-slate-400 transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`} size={20} />
                  </div>
              </button>

              <div className={`transition-all duration-300 ease-in-out origin-top ${showStats ? 'max-h-40 border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/50">
                      <div className="p-4 flex flex-col items-center justify-center text-center">
                          <Users size={20} className="text-blue-500 mb-1" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscritos</p>
                          <p className="text-2xl font-black text-slate-800">{totalEncontristas}</p>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center text-center">
                          <UserCheck size={20} className="text-emerald-500 mb-1" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presentes</p>
                          <p className="text-2xl font-black text-emerald-600">{totalPresentes}</p>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center text-center">
                          <UserX size={20} className="text-rose-500 mb-1" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ausentes</p>
                          <p className="text-2xl font-black text-rose-600">{totalAusentes}</p>
                      </div>
                  </div>
              </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder={modoSimples ? "🔍 Digite o nome e toque para marcar presença..." : "Buscar por paciente, responsável ou ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all text-base"
            />
          </div>
          
          {!modoSimples && isAdmin && (
            <div className="hidden sm:flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".txt,.csv" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
                  <Upload size={20} /> <span className="hidden lg:inline">Importar</span>
              </button>
              <button onClick={() => { setIsResetModalOpen(true); setResetError(null); }} className="bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
                  <Trash2 size={20} /> <span className="hidden lg:inline">Zerar</span>
              </button>
            </div>
          )}
        </div>

        <div className="md:hidden space-y-4">
          {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-10 h-10 animate-spin mx-auto mb-3"/>Carregando...</div> : sorted.length === 0 ? <div className="text-center py-12 text-slate-400 font-bold">Nenhum paciente encontrado.</div> : sorted.map((pessoa) => {
             const status = getStatusPessoa(pessoa);
             return (
              <motion.div
                key={pessoa.id}
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_event, info) => {
                  if (info.offset.x < -60) {
                    handleSwipeCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)
                  }
                }}
                className="relative"
              >
                <div className="absolute right-0 top-0 h-full w-20 flex items-center justify-center bg-emerald-500 rounded-2xl shadow-lg">
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                
                <div className={`
                  bg-white rounded-[2rem] border-l-8 ${status.bordaL}
                  shadow-md border-y border-r border-slate-100 overflow-hidden
                  transition-all duration-300
                  ${flashId === pessoa.id ? 'bg-emerald-100 scale-[1.02]' : ''}
                `}>
                  <div className="p-5">
                      <div className="flex justify-between items-start gap-3">
                          <div className="flex gap-4 min-w-0">
                              <div className="w-12 h-12 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center font-black text-orange-700 shrink-0 text-sm shadow-inner">
                                  {pessoa.id}
                              </div>
                              <div className="min-w-0">
                                  <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-lg font-black text-slate-800 leading-tight block mb-1 truncate">
                                      {pessoa.nome}
                                  </Link>
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-black uppercase tracking-wide ${status.cor}`}>
                                          {status.icone} {status.texto}
                                      </span>
                                  </div>
                                  {pessoa.responsavel && <p className="text-xs text-slate-500 font-medium mt-2 truncate">Resp: {pessoa.responsavel}</p>}
                              </div>
                          </div>
                          <button onClick={() => requestCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md border-2 transition-all active:scale-95 ${pessoa.check_in ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {pessoa.check_in ? <UserCheck size={28}/> : <UserX size={28}/>}
                          </button>
                      </div>

                      {pessoa.alergias && (
                          <div className="mt-4 flex items-start gap-3 bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
                              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0"/>
                              <div>
                                  <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-0.5">Alergia / Atenção</p>
                                  <p className="text-xs text-rose-700 font-bold leading-tight">{pessoa.alergias}</p>
                              </div>
                          </div>
                      )}
                  </div>
                </div>
              </motion.div>
             )
          })}
        </div>

        {!modoSimples && (
          <div className="hidden md:block space-y-3">
              
              <div className="grid grid-cols-12 gap-4 px-8 py-2 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black">
                  <div className="col-span-2">Status</div>
                  <div className="col-span-4 pl-2">Paciente</div>
                  <div className="col-span-2 text-center">Check-in</div>
                  <div className="col-span-2">Responsável</div>
                  <div className="col-span-2">Alergias</div>
              </div>

              {loading ? (
                  <div className="bg-white rounded-3xl p-16 text-center text-slate-400 font-bold border border-slate-100 shadow-sm">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                      Carregando lista...
                  </div>
              ) : sorted.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center text-slate-400 font-bold border border-slate-100 shadow-sm">
                      Nenhum resultado encontrado.
                  </div>
              ) : (
                  <div className="space-y-3">
                      {sorted.map((pessoa) => {
                          const status = getStatusPessoa(pessoa);
                          return (
                              <div key={pessoa.id} className={`group grid grid-cols-12 gap-4 items-center bg-white hover:bg-orange-50/40 rounded-3xl border-l-8 ${status.bordaL} border-y border-r border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/15 hover:scale-[1.01] transition-all duration-300 p-4 px-6`}>
                                  
                                  <div className="col-span-2">
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${status.cor}`}>
                                          {status.icone} {status.texto}
                                      </span>
                                  </div>

                                  <div className="col-span-4 flex items-center gap-4 min-w-0">
                                      <div className="w-10 h-10 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center font-black text-orange-700 text-sm shrink-0 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                          {pessoa.id}
                                      </div>
                                      <Link href={`/dashboard/encontrista/${pessoa.id}`} className="font-black text-slate-800 text-lg group-hover:text-orange-600 transition-colors truncate">
                                          {pessoa.nome}
                                      </Link>
                                  </div>

                                  <div className="col-span-2 flex justify-center">
                                      <button onClick={() => requestCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border shadow-sm transition-all ${pessoa.check_in ? 'bg-emerald-50 text-emerald-800 border-emerald-200 group-hover:bg-emerald-100' : 'bg-white text-slate-500 border-slate-200 group-hover:bg-white group-hover:border-slate-300'}`}>
                                          {pessoa.check_in ? <UserCheck size={16} /> : <UserX size={16} />} {pessoa.check_in ? 'Presente' : 'Ausente'}
                                      </button>
                                  </div>

                                  <div className="col-span-2 text-slate-500 font-bold text-sm truncate pr-4">
                                      {pessoa.responsavel || '-'}
                                  </div>

                                  <div className="col-span-2 min-w-0">
                                      {pessoa.alergias ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 max-w-full" title={pessoa.alergias}>
                                              <AlertCircle size={14} className="shrink-0" /> 
                                              <span className="truncate">{pessoa.alergias}</span>
                                          </span>
                                      ) : (
                                          <span className="text-slate-300 text-xs font-bold">-</span>
                                      )}
                                  </div>

                              </div>
                          )
                      })}
                  </div>
              )}
          </div>
        )}

      </main>

      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-end gap-3 mb-3"
            >
              <button
                onClick={() => {
                  setIsModalOpen(true)
                  setFabOpen(false)
                }}
                className="bg-white shadow-xl px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-slate-700 text-sm"
              >
                <Plus size={18} className="text-orange-500" />
                Novo Paciente
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    fileInputRef.current?.click()
                    setFabOpen(false)
                  }}
                  className="bg-white shadow-xl px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-slate-700 text-sm"
                >
                  <Upload size={18} className="text-blue-500" />
                  Importar Lista
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsResetModalOpen(true)
                    setFabOpen(false)
                  }}
                  className="bg-white shadow-xl px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-rose-600 text-sm"
                >
                  <Trash2 size={18} />
                  Zerar Sistema
                </button>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all"
          whileTap={{ scale: 0.9 }}
        >
          {fabOpen ? <X size={24} /> : <Plus size={28} />}
        </motion.button>

      </div>

      {showQueue && !modoSimples && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                ☁️ Pendências Offline
                {queueCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{queueCount}</span>
                )}
              </h2>
              <button onClick={() => setShowQueue(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="max-h-80 overflow-y-auto space-y-2 mb-5">
                {(getQueue() as OfflineQueueItem[]).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                    <p className="font-medium">Nenhuma pendência</p>
                    <p className="text-xs">Tudo sincronizado</p>
                  </div>
                ) : (
                  (getQueue() as OfflineQueueItem[]).map((item, i) => (
                    <div key={i} className="text-sm border border-slate-200 p-3 rounded-xl bg-slate-50">
                      {item.tipo === 'novo' && item.dados && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">+</div>
                          <div>
                            <p className="font-bold text-slate-700">Novo paciente</p>
                            <p className="text-xs text-slate-500">{item.dados.nome}</p>
                          </div>
                        </div>
                      )}
                      {item.tipo === 'checkin' && item.id !== undefined && item.status !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {item.status ? '✓' : '✗'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">Check-in</p>
                            <p className="text-xs text-slate-500">ID: {item.id} → {item.status ? 'Presente' : 'Ausente'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    await syncOfflineData()
                    setShowQueue(false)
                  }} 
                  disabled={queueCount === 0}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    queueCount === 0 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700'
                  }`}
                >
                  ☁️ Sincronizar
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Limpar TODAS as pendências? Essa ação não pode ser desfeita.')) {
                      localStorage.removeItem('offlineQueue')
                      updateQueueCount()
                      setShowQueue(false)
                      showToast('warning', 'Fila limpa', 'Pendências removidas localmente')
                    }
                  }} 
                  disabled={queueCount === 0}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    queueCount === 0 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600'
                  }`}
                >
                  🗑️ Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`flex items-center gap-4 p-5 rounded-[2rem] shadow-2xl border backdrop-blur-md min-w-[300px] bg-slate-800 text-white`}>
            {toast.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={28} /> : <AlertTriangle className="text-amber-400" size={28} />}
            <div className="flex-1">
              <h4 className="font-black text-sm">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-300 leading-tight mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
             <div className="p-6 flex justify-between items-center border-b border-slate-100">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus className="text-orange-600"/> Novo Paciente</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={20}/></button>
             </div>
             <form onSubmit={handleSalvar} className="p-6 space-y-5 bg-slate-50/50">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Nome Completo</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Ex: João Silva" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Opcional" /></div>
                    <div><label className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2 mb-1 block">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl font-medium focus:ring-4 focus:ring-rose-500/10" placeholder="Se houver" /></div>
                </div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Informações adicionais..." /></div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-600/30 flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin h-5 w-5"/> : <><Save size={20}/> Cadastrar</>}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isImportConfirmOpen && fileToImport && !modoSimples && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><FileSpreadsheet size={32} /></div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Importar Lista?</h2>
                <p className="text-sm font-medium text-slate-500 mb-8 bg-slate-50 py-2 rounded-xl border border-slate-100 truncate px-4">{fileToImport.name}</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsImportConfirmOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button onClick={processFileImport} disabled={importing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/30">
                        {importing ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Importar'}
                    </button>
                </div>
            </div>
         </div>
      )}

      {checkInTarget && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${checkInTarget.status ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {checkInTarget.status ? <UserX size={32} /> : <UserCheck size={32} />}
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{checkInTarget.status ? 'Remover Presença?' : 'Confirmar Presença?'}</h2>
                <p className="text-slate-500 text-lg mb-8 font-bold">{checkInTarget.nome}</p>
                <div className="flex gap-3">
                    <button onClick={() => setCheckInTarget(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button onClick={confirmCheckIn} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg ${checkInTarget.status ? 'bg-rose-500 shadow-rose-500/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>Confirmar</button>
                </div>
            </div>
         </div>
      )}

      {isResetModalOpen && !modoSimples && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 text-center border border-rose-100">
             <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><AlertTriangle className="text-rose-600 w-10 h-10" /></div>
             <h2 className="text-rose-600 font-black text-2xl mb-2">Zerar Sistema?</h2>
             <p className="text-slate-500 font-medium mb-8">Essa ação apagará <strong className="text-rose-600">todos os pacientes e históricos</strong>. É irreversível.</p>
             <form onSubmit={handleZerarSistema} className="space-y-5">
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-4 py-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-center font-black text-rose-700 focus:ring-4 focus:ring-rose-500/20 placeholder:text-rose-300 placeholder:font-medium" placeholder="Digite sua senha de admin" />
                {resetError && <p className="text-rose-600 font-black text-xs bg-rose-50 py-2 rounded-xl">{resetError}</p>}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button type="submit" disabled={isResetting} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-600/30">
                        {isResetting ? <Loader2 className="animate-spin h-6 w-6 mx-auto"/> : 'Apagar Tudo'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}