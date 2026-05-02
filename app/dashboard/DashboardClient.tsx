'use client';

import { useState, useRef, useCallback, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import { createClient } from '@/app/utils/supabase/client';
import { zerarSistemaCompleto } from '@/app/actions/system';
import { Database } from '@/types/supabase'; 
import { 
  LogOut, Plus, Search, AlertCircle, Save, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Trash2, AlertTriangle, Shield,
  CheckCircle2, FileSpreadsheet, Activity, ChevronDown,
  RefreshCw, RotateCcw, Cloud, Monitor, Smartphone, MessageCircle,
  Wifi, WifiOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse'; 
import ChatbotWidget from '@/app/components/ChatbotWidget';
import { PatientCard } from '@/app/components/PatientCard';
import { PatientDetail } from '@/app/components/PatientDetail';
import { createEncontristaRepository } from '@/infra/repositories/encontrista.repository';
import { calcularStatusPessoa } from '@/domain/medicacao/medicacao.rules';
import { toggleCheckin } from '@/application/use-cases/toggleCheckin';
import { criarEncontrista } from '@/application/use-cases/criarEncontrista';
import { queueService } from '@/infra/offline/queue.service';
import { syncEngine } from '@/infra/offline/sync.engine';
import { QueueItem } from '@/domain/offline/queue.types';
import { useOfflineNavigation } from '@/app/hooks/useOfflineNavigation';
import { getAllPacientes, preloadPacienteById } from '@/app/lib/offlineRepository';
import { useDashboardActions } from './layout';
import { useCacheGate } from '@/app/hooks/useCacheGate';

// --- EASING PREMIUM (iOS-LIKE) ---
const premiumEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fastTransition: Transition = { duration: 0.18, ease: premiumEasing };
const springTransition: Transition = { type: 'spring', stiffness: 350, damping: 28 };

// --- FUNÇÃO SAFE QUERY ---
async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    if (result && typeof result === 'object') {
      const possibleError = result as { error?: { message: string } };
      if (possibleError.error) {
        throw possibleError.error;
      }
    }
    return result;
  } catch (err) {
    console.error('Erro crítico:', err);
    alert('Erro de conexão. Clique em "Recarregar Sistema".');
    return null;
  }
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function toEncontristaDashboard(row: unknown): EncontristaDashboard | null {
  if (!row || typeof row !== 'object') return null;
  const typedRow = row as Record<string, unknown>;
  if (typeof typedRow.id !== 'number') return null;
  if (typeof typedRow.nome !== 'string') return null;
  const prescricoes = Array.isArray(typedRow.prescricoes) 
    ? typedRow.prescricoes as EncontristaDashboard['prescricoes']
    : [];
  return {
    id: typedRow.id,
    nome: typedRow.nome,
    responsavel: typedRow.responsavel as string | null || null,
    alergias: typedRow.alergias as string | null || null,
    observacoes: typedRow.observacoes as string | null || null,
    check_in: typedRow.check_in === true,
    created_at: typedRow.created_at as string || new Date().toISOString(),
    prescricoes
  };
}

function getQueueItemSummary(item: QueueItem) {
  switch (item.tipo) {
    case 'criar_paciente':
      return { title: 'Novo paciente', detail: item.payload.nome, accent: 'bg-blue-100 text-blue-600', icon: '+' };
    case 'atualizar_paciente':
      return { title: 'Atualizar paciente', detail: item.payload.nome, accent: 'bg-amber-100 text-amber-600', icon: '↻' };
    case 'deletar_paciente':
      return { title: 'Excluir paciente', detail: item.payload.pacienteRef.id ? `ID ${item.payload.pacienteRef.id}` : item.payload.pacienteRef.tempId || 'temp', accent: 'bg-rose-100 text-rose-600', icon: '×' };
    case 'criar_medicacao':
      return { title: 'Nova medicação', detail: item.payload.nome_medicamento, accent: 'bg-violet-100 text-violet-600', icon: '+' };
    case 'administrar_medicacao':
      return { title: 'Administrar medicação', detail: item.payload.data_hora, accent: 'bg-emerald-100 text-emerald-600', icon: '✓' };
    case 'deletar_medicacao':
      return { title: 'Excluir medicação', detail: item.payload.medicacaoRef.id ? `ID ${item.payload.medicacaoRef.id}` : item.payload.medicacaoRef.tempId || 'temp', accent: 'bg-rose-100 text-rose-600', icon: '×' };
    case 'deletar_historico':
      return { title: 'Excluir histórico', detail: item.payload.historicoRef.id ? `ID ${item.payload.historicoRef.id}` : item.payload.historicoRef.tempId || 'temp', accent: 'bg-rose-100 text-rose-600', icon: '×' };
    case 'checkin':
      return { title: 'Check-in', detail: `${item.payload.pacienteRef.id ? `ID ${item.payload.pacienteRef.id}` : item.payload.pacienteRef.tempId || 'temp'} → ${item.payload.check_in ? 'Presente' : 'Ausente'}`, accent: item.payload.check_in ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600', icon: item.payload.check_in ? '✓' : '•' };
  }
}

export default function DashboardClient({ 
  initialEncontristas, 
  isAdminInitial 
}: DashboardClientProps) {
  
  const [encontristas, setEncontristas] = useState<EncontristaDashboard[]>(initialEncontristas);
  const [isAdmin] = useState(isAdminInitial);
  const [loading, setLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
  const [selectedPatient, setSelectedPatient] = useState<EncontristaDashboard | null>(null);

  const [modoEmergencia, setModoEmergencia] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  
  // Modo simples no mobile, completo no desktop
  const [modoSimples, setModoSimples] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  
  const [openMenu, setOpenMenu] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Bloqueia updates durante navegação
  const [isNavigating, setIsNavigating] = useState(false);

  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  
  // 🔥 HOOK DE NAVEGAÇÃO OFFLINE
  const { navigateTo } = useOfflineNavigation();
  
  // 🔥 CONTEXTO DO LAYOUT PARA AÇÕES
  const { setOnImport, setOnReset } = useDashboardActions();

  // 🔥 HOOK DE CACHE GATE (BLINDADO)
  const {
    startPreload,
    markCacheReady,
    waitForCache,
    cleanup
  } = useCacheGate();

  // ============================================================
  // 🔥 REGISTRA AS FUNÇÕES DE AÇÃO NO CONTEXTO DO LAYOUT
  // ============================================================
  useEffect(() => {
    const importHandler = () => {
      fileInputRef.current?.click();
    };
    const resetHandler = () => {
      setIsResetModalOpen(true);
      setResetError(null);
    };

    setOnImport(() => importHandler);
    setOnReset(() => resetHandler);

    return () => {
      setOnImport(() => null);
      setOnReset(() => null);
    };
  }, [setOnImport, setOnReset]);

  // ============================================================
  // 🔥 CLEANUP DO CACHE GATE
  // ============================================================
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ============================================================
  // 🔥 PRECACHE DAS ROTAS
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DASHBOARD',
        url: '/dashboard'
      });
    }
  }, []);

  // ============================================================
  // 🔥 PRELOAD EM LOTE (CONCORRÊNCIA CONTROLADA)
  // ============================================================
  const CONCURRENCY = 5;

  async function preloadInBatches(ids: number[]) {
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const batch = ids.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (id) => {
          try {
            await preloadPacienteById(id);
            console.log(`[CACHE] Paciente ${id} OK`);
          } catch (e) {
            console.warn(`[CACHE] erro ${id}`, e);
          }
        })
      );
    }
  }

  useEffect(() => {
    if (encontristas.length === 0) return;

    const run = async () => {
      const runId = startPreload();

      try {
        const ids = encontristas.map(e => e.id);
        await preloadInBatches(ids);
        markCacheReady(runId);
        console.log('[CACHE] preload finalizado com sucesso');
      } catch (err) {
        console.error('[CACHE] erro no preload', err);
        markCacheReady(runId);
      }
    };

    run();
  }, [encontristas, startPreload, markCacheReady]);

  // ============================================================
  // 🔥 CARREGAR DO INDEXEDDB QUANDO INITIAL_ENCONTRISTAS ESTIVER VAZIO
  // 🔥 CORREÇÃO: retry automático se vazio e log para debug
  // ============================================================
  useEffect(() => {
    const loadOfflineDashboard = async () => {
      try {
        const pacientes = await getAllPacientes();

        console.log('[IDB LOAD]', pacientes.length, 'pacientes encontrados');

        if (pacientes.length > 0) {
          const mapped = pacientes.map(p => ({
            id: p.id,
            nome: p.paciente.nome,
            responsavel: p.paciente.responsavel,
            alergias: p.paciente.alergias,
            observacoes: p.paciente.observacoes,
            check_in: p.paciente.check_in,
            created_at: p.paciente.created_at,
            prescricoes: []
          }));

          setEncontristas(mapped as EncontristaDashboard[]);
        } else {
          console.log('[IDB] vazio, tentando novamente em 1 segundo...');
          setTimeout(loadOfflineDashboard, 1000);
        }
      } catch (err) {
        console.warn('[IDB] erro ao carregar dashboard', err);
        setTimeout(loadOfflineDashboard, 2000);
      }
    };

    // Só tenta carregar do IDB se não houver dados iniciais (offline)
    if (initialEncontristas.length === 0) {
      loadOfflineDashboard();
    }
  }, [initialEncontristas]);

  // ============================================================
  // LISTENER PARA REDIMENSIONAMENTO
  // ============================================================
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setModoSimples(isMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================
  // DEBOUNCE PARA BUSCA
  // ============================================================
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ============================================================
  // PRÉ-NORMALIZAÇÃO DOS DADOS
  // ============================================================
  const normalizedEncontristas = useMemo(() => {
    return encontristas.map(p => ({
      ...p,
      nome_lower: (p.nome || '').toLowerCase(),
      responsavel_lower: (p.responsavel || '').toLowerCase(),
      id_str: String(p.id)
    }));
  }, [encontristas]);

  const toOriginalEncontrista = useCallback((p: typeof normalizedEncontristas[number]): EncontristaDashboard => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nome_lower, responsavel_lower, id_str, ...original } = p;
    return original as EncontristaDashboard;
  }, []);

  // ============================================================
  // FILTRO CORRIGIDO - Busca exata por número
  // ============================================================
  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    
    if (!term) {
      return normalizedEncontristas.map(toOriginalEncontrista);
    }

    const isNumeric = /^\d+$/.test(term);

    if (isNumeric) {
      const exact = normalizedEncontristas.filter(p => p.id_str === term);
      return exact.map(toOriginalEncontrista);
    }

    const resultados = normalizedEncontristas.filter(p => {
      return (
        p.nome_lower.includes(term) ||
        p.responsavel_lower.includes(term)
      );
    });

    return resultados.map(toOriginalEncontrista);
  }, [normalizedEncontristas, debouncedSearch, toOriginalEncontrista]);

  const updateQueueCount = useCallback(() => {
    setQueueCount(queueService.getQueueCount());
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000); 
  }, []);

  const totalEncontristas = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalEncontristas - totalPresentes;

  // ============================================================
  // BUSCAR ENCONTRISTAS (ONLINE)
  // ============================================================
  const buscarEncontristas = useCallback(async () => {
    if (isNavigating) return;
    
    const fetchId = ++fetchIdRef.current;
    setLoading(true);

    const supabaseClient = createClient();
    const repo = createEncontristaRepository(supabaseClient);
    const { data, error } = await repo.findAll();

    if (fetchId !== fetchIdRef.current) {
      console.log('[DASHBOARD] Ignorando resposta antiga');
      return;
    }

    if (error) {
      console.error('[DASHBOARD] Erro:', error);
      showToast('error', 'Erro ao carregar', 'Não foi possível buscar os dados.');
      setLoading(false);
      return;
    }

    if (data) {
      setEncontristas(data);      
    }

    setLoading(false);
  }, [showToast, isNavigating]);

  // ============================================================
  // SINCRONIZAÇÃO OFFLINE
  // ============================================================
  const syncOfflineData = useCallback(async () => {
    if (isNavigating) return;
    
    const supabaseClient = createClient();
    const result = await syncEngine.process({
      supabase: supabaseClient
    });

    updateQueueCount();
    await buscarEncontristas();

    if (result.total === 0) {
      showToast('warning', 'Sincronização', 'Nenhum dado pendente');
      return;
    }

    if (result.falhas === 0) {
      showToast('success', 'Sincronização completa', `${result.sucessos} itens enviados`);
    } else {
      showToast('warning', 'Sincronização parcial', `${result.falhas} itens pendentes`);
    }
  }, [buscarEncontristas, showToast, updateQueueCount, isNavigating]);

  // ============================================================
  // SYNC AUTOMÁTICO CONTÍNUO
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let interval: NodeJS.Timeout;

    const startSyncLoop = () => {
      interval = setInterval(() => {
        if (!navigator.onLine) return;

        const pending = queueService.getQueueCount();

        if (pending > 0) {
          console.log('[SYNC] auto executando...', pending);
          syncOfflineData();
        }
      }, 10000);
    };

    startSyncLoop();

    return () => {
      clearInterval(interval);
    };
  }, [syncOfflineData]);

  // ============================================================
  // ONLINE/OFFLINE
  // ============================================================
  useEffect(() => {
    const update = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online) {
        syncOfflineData();
      } else {
        showToast('warning', 'Sem internet', 'Modo offline ativado.');
      }
    };

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [syncOfflineData, showToast]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'SYNC_OFFLINE_DATA' && navigator.onLine) {
        void syncOfflineData();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [syncOfflineData]);

  useEffect(() => {
    if (modoSimples && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modoSimples]);

  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      evt.preventDefault();
      setDeferredPrompt(evt);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log('[PWA] escolha:', choice.outcome);
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const toggleModoSimples = useCallback(() => {
    startTransition(() => {
      setModoSimples(prev => !prev);
    });
  }, []);

  // --- EVENTO PERSONALIZADO PARA REFRESH ---
  useEffect(() => {
    const handleDashboardRefresh = () => {
      console.log('[DASHBOARD] Refresh manual disparado');
      buscarEncontristas();
    };
    window.addEventListener('dashboard-refresh', handleDashboardRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
    };
  }, [buscarEncontristas]);

  // ============================================================
  // DEBOUNCE REFETCH
  // ============================================================
  const debounceRefetch = useCallback(() => {
    if (isNavigating) return;
    
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      buscarEncontristas();
    }, 1000);
  }, [buscarEncontristas, isNavigating]);

  // ============================================================
  // REALTIME SUPABASE
  // ============================================================
  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'encontristas',
        },
        (payload) => {
          console.log('[REALTIME] encontristas', payload);
          
          if (isNavigating) return;

          setEncontristas((prev) => {
            const { eventType, new: newRow, old } = payload;
            const validatedNew = toEncontristaDashboard(newRow);
            const validatedOld = old as { id: number };
            
            if (eventType === 'INSERT' && validatedNew) {
              return [validatedNew, ...prev];
            }
            if (eventType === 'UPDATE' && validatedNew) {
              return prev.map(p =>
                p.id === validatedNew.id ? { ...p, ...validatedNew } : p
              );
            }
            if (eventType === 'DELETE' && validatedOld?.id) {
              return prev.filter(p => p.id !== validatedOld.id);
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescricoes',
        },
        () => {
          console.log('[REALTIME] prescricoes → refetch com debounce');
          debounceRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historico_administracao',
        },
        () => {
          console.log('[REALTIME] historico → refetch com debounce');
          debounceRefetch();
        }
      )
      .subscribe();

    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, debounceRefetch, isNavigating]);

  useEffect(() => {
    const currentFetchId = fetchIdRef.current;
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      fetchIdRef.current = currentFetchId + 1;
    };
  }, []);

  // --- ADAPTADOR UI ↔ DOMÍNIO (STATUS) ---
  const getStatusPessoa = useCallback((pessoa: EncontristaDashboard) => {
    const status = calcularStatusPessoa(pessoa);
    return {
      cor: status.cor,
      bordaL: status.bordaL,
      texto: status.texto,
      prioridade: status.prioridade,
      icone: status.icone === 'atrasado' ? <AlertTriangle size={16}/> :
              status.icone === 'atencao' ? <Clock size={16}/> :
              status.icone === 'emdia' ? <CheckCircle2 size={16}/> :
              <Activity size={16}/>
    };
  }, []);

  useEffect(() => {
    updateQueueCount();
  }, [updateQueueCount]);

  // EFEITO PARA HIGHLIGHT DO CARD
  useEffect(() => {
    const term = searchTerm.trim();
    const isNumeric = /^\d+$/.test(term);
    
    if (isNumeric && term) {
      const exact = encontristas.find(p => String(p.id) === term);
      if (exact) {
        setFlashId(exact.id);
        const timeout = setTimeout(() => {
          setFlashId(null);
        }, 800);
        return () => clearTimeout(timeout);
      }
    }
  }, [searchTerm, encontristas]);

  const statusMap = useMemo(() => {
    const map = new Map();
    for (const pessoa of filtered) {
      map.set(pessoa.id, getStatusPessoa(pessoa));
    }
    return map;
  }, [filtered, getStatusPessoa]);

  // ============================================================
  // SORT CORRIGIDO
  // ============================================================
  const sorted = useMemo(() => {
    const term = debouncedSearch.trim();
    const isNumeric = /^\d+$/.test(term);
    
    return [...filtered].sort((a, b) => {
      if (isNumeric) {
        const aIsExact = String(a.id) === term;
        const bIsExact = String(b.id) === term;
        
        if (aIsExact && !bIsExact) return -1;
        if (!aIsExact && bIsExact) return 1;
      }
      
      const statusA = statusMap.get(a.id);
      const statusB = statusMap.get(b.id);
      const priorityDiff = (statusB?.prioridade || 0) - (statusA?.prioridade || 0);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.id - b.id;
    });
  }, [filtered, statusMap, debouncedSearch]);

  const getConnectionStatus = () => {
    if (!isOnline) return { text: 'Offline', bg: 'bg-rose-100 text-rose-700', icon: <WifiOff size={12} className="inline mr-1" /> };
    if (queueCount > 0) return { text: 'Pendente', bg: 'bg-amber-100 text-amber-700', icon: <Cloud size={12} className="inline mr-1" /> };
    return { text: 'Online', bg: 'bg-emerald-100 text-emerald-700', icon: <Wifi size={12} className="inline mr-1" /> };
  };

  const connectionStatus = getConnectionStatus();

  const reloadData = async () => {
    await buscarEncontristas();
    showToast('success', 'Atualizado', 'Dados sincronizados com o servidor');
  };

  const hardReload = () => {
    window.location.reload();
  };

  const requestCheckIn = (id: number, currentStatus: boolean, nome: string) => {
    setCheckInTarget({ id, status: currentStatus, nome });
  };

  const confirmCheckIn = async () => {
    if (!checkInTarget) return;
    
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada');
      return;
    }

    const { id, status } = checkInTarget;

    setFlashId(id);
    setTimeout(() => setFlashId(null), 300);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const backup = [...encontristas];

    setEncontristas(prev =>
      prev.map(p => p.id === id ? { ...p, check_in: !status } : p)
    );

    setCheckInTarget(null);

    const result = await toggleCheckin(
      { id, statusAtual: status, isOnline },
      {
        updateRemote: async (id, status) => {
          return await supabase.from('encontristas').update({ check_in: status }).eq('id', id);
        },
        addToQueue: (item) => {
          queueService.enqueue(item);
          updateQueueCount();
        }
      }
    );

    if (result.queued) {
      showToast('warning', 'Offline', 'Check-in salvo localmente.');
      return;
    }

    if (result.shouldRollback) {
      setEncontristas(backup);
      showToast('error', 'Erro', 'Falha ao atualizar no servidor');
    }
  };

  const cancelCheckIn = () => {
    setCheckInTarget(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada');
      return;
    }

    setSaving(true);

    const result = await criarEncontrista(
      { nome: novoNome, responsavel: novoResponsavel, alergias: novasAlergias, observacoes: novasObservacoes, isOnline },
      {
        insertRemote: async (data) => {
          return await supabase.from('encontristas').insert(data);
        },
        addToQueue: (item) => {
          queueService.enqueue(item);
          updateQueueCount();
        }
      }
    );

    if (result.queued) {
      showToast('warning', 'Offline', 'Paciente salvo localmente.');
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes('');
      setIsModalOpen(false);
      setSaving(false);
      return;
    }

    if (!result.success) {
      showToast('warning', 'Atenção', result.error || 'Erro ao salvar');
      setSaving(false);
      return;
    }

    showToast('success', 'Cadastrado!', `${novoNome} adicionado.`);
    setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes('');
    setIsModalOpen(false);
    await buscarEncontristas();
    setSaving(false);
  };

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada');
      return;
    }
    
    setResetError(null);
    setIsResetting(true);
    const resultado = await zerarSistemaCompleto(resetPassword);
    if (resultado.success) {
      queueService.clearQueue();
      updateQueueCount();
      await buscarEncontristas();
      setIsResetModalOpen(false);
      setResetPassword('');
      setSelectedPatient(null);
      showToast('success', 'Sistema Zerado', 'Dados limpos com sucesso.');
    } else {
      setResetError(resultado.message);
    }
    setIsResetting(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (modoEmergencia) {
      showToast('warning', 'Modo emergência', 'Ação bloqueada');
      return;
    }
    const file = event.target.files?.[0];
    if (file) { setFileToImport(file); setIsImportConfirmOpen(true); }
    event.target.value = '';
  };

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
          showToast('warning', 'Atenção', 'Nenhum registro válido encontrado.');
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
          showToast('error', 'Falha na Importação', 'Nenhum dado foi importado.');
        }
        
        setImporting(false);
        setIsImportConfirmOpen(false);
        setFileToImport(null);
      },
      error: () => {
        showToast('error', 'Erro de Leitura', 'Falha na leitura do arquivo.');
        setImporting(false);
      }
    });
  };

  const handlePatientCheckIn = (id: number, currentStatus: boolean, nome: string) => {
    requestCheckIn(id, currentStatus, nome);
    setTimeout(() => confirmCheckIn(), 100);
  };

  // ✅ NAVEGAÇÃO REFATORADA COM waitForCache
  const handleNavigateToPatientPage = useCallback(async (id: number) => {
    if (isNavigating) return;

    setIsNavigating(true);

    try {
      if (!navigator.onLine) {
        console.log('[OFFLINE] navegando direto');
      } else {
        await waitForCache();
      }

      await navigateTo(`/dashboard/encontrista/${id}`);
    } catch (err) {
      console.error('[NAV] erro', err);
    } finally {
      setIsNavigating(false);
    }
  }, [navigateTo, waitForCache, isNavigating]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      
      {/* HEADER COMPLETO (SEMPRE VISÍVEL NO DESKTOP) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md flex items-center justify-center">
              <span className="text-white font-black text-sm">FF</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
              Face a Face <span className="hidden sm:inline-block text-[10px] font-black tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">Igreja Batista Apascentar</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {showInstallButton && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={fastTransition}
                onClick={handleInstallClick}
                className="px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-md"
              >
                📱 Instalar App
              </motion.button>
            )}

            {/* Botão Chat */}
            <button
              onClick={() => setChatbotOpen(true)}
              className="hidden md:flex px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 items-center gap-2"
              >
              <MessageCircle size={16} /> Chat
            </button>

            {/* Botões de toggle modo */}
            <div className="hidden md:flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={fastTransition}
                onClick={() => { if (!modoSimples) toggleModoSimples(); }}
                disabled={isPending}
                className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-all disabled:opacity-50 ${modoSimples ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Smartphone size={16} />
                <span className="hidden sm:inline">Simples</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={fastTransition}
                onClick={() => { if (modoSimples) toggleModoSimples(); }}
                disabled={isPending}
                className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black transition-all disabled:opacity-50 ${!modoSimples ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Monitor size={16} />
                <span className="hidden sm:inline">Completo</span>
              </motion.button>
            </div>

            {/* Status de conexão */}
            <div className={`hidden sm:block px-3 py-1.5 rounded-full text-xs font-bold ${connectionStatus.bg}`}>
              {connectionStatus.icon} {connectionStatus.text}
              {queueCount > 0 && <span className="ml-1 font-black">({queueCount})</span>}
            </div>

            {/* Menu dropdown */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={fastTransition}
                onClick={() => setOpenMenu(!openMenu)}
                className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-md"
              >
                ☰
              </motion.button>

              <AnimatePresence>
                {openMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={fastTransition}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                  >
                    <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => { reloadData(); setOpenMenu(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-all text-base font-semibold text-slate-700 flex items-center gap-3">
                      <RefreshCw size={18} className="text-slate-500" /> Recarregar Dados
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => { hardReload(); setOpenMenu(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-all text-base font-semibold text-slate-700 flex items-center gap-3">
                      <RotateCcw size={18} className="text-slate-500" /> Recarregar Sistema
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => { setModoEmergencia(!modoEmergencia); setOpenMenu(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-all text-base font-semibold text-slate-700 flex items-center gap-3">
                      <AlertTriangle size={18} className="text-amber-500" /> Modo Emergência {modoEmergencia && '(Ativo)'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => { setShowQueue(true); setOpenMenu(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-all text-base font-semibold text-slate-700 flex items-center gap-3">
                      <Cloud size={18} className="text-slate-500" /> Pendências ({queueCount})
                    </motion.button>
                    
                    {isAdmin && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <Link href="/dashboard/equipe" onClick={() => setOpenMenu(false)} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-slate-50 transition-all text-base font-semibold text-slate-700 flex items-center gap-3">
                          <Shield size={18} className="text-slate-500" /> Equipe
                        </Link>
                      </>
                    )}
                    
                    <div className="border-t border-slate-100 my-1" />
                    <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-rose-50 transition-all text-base font-semibold text-rose-600 flex items-center gap-3">
                      <LogOut size={18} /> Sair
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* STATS EXPANDIBLE (VISÃO GERAL - Apenas no modo completo) */}
        {!modoSimples && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={fastTransition} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button onClick={() => setShowStats(!showStats)} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
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

            <AnimatePresence>
              {showStats && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={fastTransition} className="border-t border-slate-100">
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* MINI STATS BAR PARA MOBILE */}
        {modoSimples && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fastTransition}
            className="px-0 mt-0"
          >
            <div className="flex items-center justify-between bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-3">
              <div className="flex items-center gap-4 text-[11px] font-black tracking-wide">
                <motion.span
                  key={totalEncontristas}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="text-slate-600"
                >
                  👥 {totalEncontristas}
                </motion.span>
                <motion.span
                  key={totalPresentes}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="text-emerald-600"
                >
                  ✅ {totalPresentes}
                </motion.span>
                <motion.span
                  key={totalAusentes}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="text-rose-600"
                >
                  ❌ {totalAusentes}
                </motion.span>
              </div>

              <div className={`text-[10px] px-2 py-1 rounded-full font-bold ${connectionStatus.bg}`}>
                {connectionStatus.icon} {connectionStatus.text}
                {queueCount > 0 && <span className="ml-1 bg-white/50 px-1 rounded-full">{queueCount}</span>}
              </div>
            </div>
          </motion.div>
        )}

        {/* SEARCH BAR */}
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder={modoSimples ? "Buscar por nome ou ID..." : "Buscar por nome, responsável ou ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all text-base"
            />
            
            {isTyping && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={18} className="text-orange-500 animate-spin" />
              </div>
            )}
            
            {!isTyping && searchTerm && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  {filtered.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* TÍTULO DOS RESULTADOS */}
        {searchTerm && !isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-2"
          >
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {filtered.length === 0 
                ? 'Nenhum resultado encontrado' 
                : `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
              }
            </p>
          </motion.div>
        )}

        {/* LISTA MOBILE */}
        {modoSimples && (
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {!selectedPatient && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fastTransition}
                >
                  {loading ? (
                    <div className="text-center py-12 text-slate-400">
                      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3"/>
                      <span className="font-medium">Carregando...</span>
                    </div>
                  ) : sorted.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={fastTransition}
                      className="text-center py-16 bg-white rounded-2xl border border-slate-100"
                    >
                      <Search size={48} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold">Nenhum paciente encontrado.</p>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold"
                        >
                          + Adicionar primeiro paciente
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ 
                        scale: selectedPatient ? 0.96 : 1,
                        filter: selectedPatient ? 'blur(3px)' : 'blur(0px)'
                      }}
                      transition={fastTransition}
                    >
                      {sorted.map((pessoa, index) => (
                        <motion.div
                          key={pessoa.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.025, 
                            duration: 0.18, 
                            ease: premiumEasing 
                          }}
                        >
                          <PatientCard
                            id={pessoa.id}
                            nome={pessoa.nome}
                            responsavel={pessoa.responsavel}
                            alergias={pessoa.alergias}
                            status={statusMap.get(pessoa.id)}
                            checkIn={pessoa.check_in || false}
                            flashId={flashId}
                            onCheckIn={handlePatientCheckIn}
                            onClick={() => setSelectedPatient(pessoa)}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {selectedPatient && (
                <PatientDetail
                  key="detail"
                  paciente={selectedPatient}
                  onClose={() => setSelectedPatient(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* LISTA DESKTOP */}
        {!modoSimples && (
          <motion.div
            animate={{ 
              scale: selectedPatient ? 0.96 : 1,
              filter: selectedPatient ? 'blur(3px)' : 'blur(0px)'
            }}
            transition={fastTransition}
            className="space-y-3"
          >
            <div className="grid grid-cols-12 gap-4 px-8 py-2 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black">
              <div className="col-span-2">Status</div>
              <div className="col-span-4 pl-2">Paciente</div>
              <div className="col-span-2 text-center">Check-in</div>
              <div className="col-span-2">Responsável</div>
              <div className="col-span-2">Alergias</div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-16 text-center text-slate-400 font-bold border border-slate-100 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                Carregando lista...
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center text-slate-400 font-bold border border-slate-100 shadow-sm">
                Nenhum resultado encontrado.
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-2">
                  {sorted.map((pessoa, index) => {
                    const status = statusMap.get(pessoa.id);
                    const statusText = status?.texto?.toLowerCase() || '';
                    const isAtrasado = statusText.includes('atrasad');
                    const isEmDia = statusText.includes('em dia');
                    const isSemMeds = statusText.includes('sem meds');

                    let pillBgClass = '';
                    let pillTextClass = 'text-orange-400';
                    let pillBorderClass = '';

                    if (isEmDia) {
                      pillBgClass = 'bg-emerald-200';
                      pillBorderClass = 'border-emerald-300';
                    } else if (isAtrasado) {
                      pillBgClass = 'bg-rose-200';
                      pillBorderClass = 'border-rose-300';
                    } else if (isSemMeds) {
                      pillBgClass = 'bg-gray-200';
                      pillBorderClass = 'border-gray-300';
                    } else {
                      pillBgClass = status?.cor || 'bg-slate-100';
                      pillTextClass = status?.cor?.includes('orange') ? 'text-orange-600' : 'text-slate-600';
                      pillBorderClass = 'border-transparent';
                    }

                    const customPillColor = `${pillBgClass} ${pillTextClass} ${pillBorderClass} border`;

                    return (
                      <motion.div 
                        key={pessoa.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.02, 
                          duration: 0.18, 
                          ease: premiumEasing 
                        }}
                        className={`group grid grid-cols-12 gap-4 items-center bg-white hover:bg-orange-50/40 rounded-xl border-l-4 ${status?.bordaL || 'border-l-slate-300'} border-y border-r border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 p-3 px-5 cursor-pointer`}
                        onClick={() => handleNavigateToPatientPage(pessoa.id)}
                      >
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${customPillColor}`}>
                            {status?.icone} {status?.texto}
                          </span>
                        </div>

                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center font-black text-orange-700 text-xs shrink-0 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-colors duration-200">
                            {pessoa.id}
                          </div>
                          <span className="font-bold text-slate-800 text-base group-hover:text-orange-600 transition-colors truncate">
                            {pessoa.nome}
                          </span>
                        </div>

                        <div className="col-span-2 flex justify-center">
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            transition={fastTransition}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handlePatientCheckIn(pessoa.id, pessoa.check_in || false, pessoa.nome); 
                            }} 
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black border shadow-sm transition-all ${pessoa.check_in ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {pessoa.check_in ? <UserCheck size={14} /> : <UserX size={14} />} {pessoa.check_in ? 'Presente' : 'Ausente'}
                          </motion.button>
                        </div>

                        <div className="col-span-2 text-slate-500 font-medium text-sm truncate pr-3">
                          {pessoa.responsavel || <span className="text-slate-300">-</span>}
                        </div>

                        <div className="col-span-2 min-w-0">
                          {pessoa.alergias ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 max-w-full" title={pessoa.alergias}>
                              <AlertCircle size={12} className="shrink-0" /> 
                              <span className="truncate">{pessoa.alergias}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[11px] font-medium">-</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        )}

      </main>

      {/* 🔥 BOTÃO FAB (apenas no modo simples) */}
      {modoSimples && !chatbotOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={fastTransition}
                className="flex flex-col items-end gap-2 mb-4"
              >
                <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => { setChatbotOpen(true); setFabOpen(false); }} className="bg-white text-slate-700 shadow-lg px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm border border-slate-200">
                  <MessageCircle size={18} className="text-orange-500" /> Chat
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => { setIsModalOpen(true); setFabOpen(false); }} className="bg-white text-slate-700 shadow-lg px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm border border-slate-200">
                  <Plus size={18} className="text-emerald-500" /> Novo Paciente
                </motion.button>
                {isAdmin && (
                  <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => { fileInputRef.current?.click(); setFabOpen(false); }} className="bg-white text-slate-700 shadow-lg px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm border border-slate-200">
                    <Upload size={18} className="text-blue-500" /> Importar Lista
                  </motion.button>
                )}
                {isAdmin && (
                  <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => { setIsResetModalOpen(true); setFabOpen(false); }} className="bg-white text-rose-600 shadow-lg px-5 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm border border-rose-200">
                    <Trash2 size={18} /> Zerar Sistema
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setFabOpen(prev => !prev)}
            whileTap={{ scale: 0.9 }}
            transition={fastTransition}
            animate={{ rotate: fabOpen ? 45 : 0 }}
            className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center"
          >
            <Plus size={24} />
          </motion.button>
        </div>
      )}

      {/* 🔥 CHATBOT GLOBAL */}
      <ChatbotWidget
        isOpen={chatbotOpen}
        onOpenChange={(isOpen) => {
          setChatbotOpen(isOpen);
          if (isOpen) setFabOpen(false);
        }}
      />

      {/* MODAIS */}
      <AnimatePresence>
        {showQueue && !modoSimples && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fastTransition} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={springTransition} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  ☁️ Pendências Offline {queueCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{queueCount}</span>}
                </h2>
                <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => setShowQueue(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18} /></motion.button>
              </div>
              <div className="p-5">
                <div className="max-h-80 overflow-y-auto space-y-2 mb-5">
                  {queueService.getQueue().length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                      <p className="font-medium">Nenhuma pendência</p>
                      <p className="text-xs">Tudo sincronizado</p>
                    </div>
                  ) : (
                    queueService.getQueue().map((item, i) => {
                      const summary = getQueueItemSummary(item);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.12, ease: premiumEasing }}
                          className="text-sm border border-slate-200 p-3 rounded-xl bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${summary.accent}`}>
                              {summary.icon}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{summary.title}</p>
                              <p className="text-xs text-slate-500">{summary.detail}</p>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                            <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                            <span>{item.status === 'failed' ? `falhou ${item.retryCount}x` : `${item.status} • ${item.retryCount}x`}</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-3">
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={async () => { await syncOfflineData(); setShowQueue(false); }} disabled={queueCount === 0} className={`flex-1 py-3 rounded-xl font-bold transition-all ${queueCount === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>☁️ Sincronizar</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => { if (confirm('Limpar TODAS as pendências? Essa ação não pode ser desfeita.')) { queueService.clearQueue(); updateQueueCount(); setShowQueue(false); showToast('warning', 'Fila limpa', 'Pendências removidas localmente'); } }} disabled={queueCount === 0} className={`flex-1 py-3 rounded-xl font-bold transition-all ${queueCount === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-500 text-white shadow-md hover:bg-red-600'}`}>🗑️ Limpar</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }} transition={{ type: 'spring', damping: 20 }} className="fixed bottom-6 right-6 z-[100]">
            <div className={`flex items-center gap-4 p-4 rounded-2xl shadow-xl backdrop-blur-md min-w-[280px] ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <div className="flex-1"><h4 className="font-bold text-sm">{toast.title}</h4><p className="text-xs opacity-90 leading-tight mt-0.5">{toast.message}</p></div>
              <motion.button whileTap={{ scale: 0.9 }} transition={fastTransition} onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={18} /></motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fastTransition} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={springTransition} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="p-5 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus className="text-orange-500"/> Novo Paciente</h2>
                <motion.button whileTap={{ scale: 0.95 }} transition={fastTransition} onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18}/></motion.button>
              </div>
              <form onSubmit={handleSalvar} className="p-5 space-y-4">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-2 mb-1 block">Nome Completo *</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Ex: João Silva" required /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-2 mb-1 block">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Opcional" /></div>
                  <div><label className="text-[10px] font-black text-rose-500 uppercase tracking-wider pl-2 mb-1 block">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" placeholder="Se houver" /></div>
                </div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-2 mb-1 block">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Informações adicionais..." /></div>
                <div className="flex justify-end gap-3 pt-3">
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-500">Cancelar</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} type="submit" disabled={saving} className="px-6 py-2.5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin h-4 w-4"/> : <><Save size={16}/> Cadastrar</>}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportConfirmOpen && fileToImport && !modoSimples && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fastTransition} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={springTransition} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4"><FileSpreadsheet size={28} /></div>
              <h2 className="text-xl font-black text-slate-800 mb-2">Importar Lista?</h2>
              <p className="text-sm font-medium text-slate-500 mb-6 bg-slate-50 py-2 rounded-xl border border-slate-100 truncate px-3">{fileToImport.name}</p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={() => setIsImportConfirmOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={processFileImport} disabled={importing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md">{importing ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Importar'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkInTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fastTransition} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={springTransition} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${checkInTarget.status ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {checkInTarget.status ? <UserX size={28} /> : <UserCheck size={28} />}
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">{checkInTarget.status ? 'Remover Presença?' : 'Confirmar Presença?'}</h2>
              <p className="text-slate-500 text-base mb-6 font-bold">{checkInTarget.nome}</p>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={cancelCheckIn} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} onClick={confirmCheckIn} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md ${checkInTarget.status ? 'bg-rose-500' : 'bg-emerald-600'}`}>Confirmar</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResetModalOpen && !modoSimples && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fastTransition} className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={springTransition} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center border border-rose-100">
              <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-rose-600 w-8 h-8" /></div>
              <h2 className="text-rose-600 font-black text-xl mb-2">Zerar Sistema?</h2>
              <p className="text-slate-500 font-medium mb-6">Essa ação apagará <strong className="text-rose-600">todos os pacientes e históricos</strong>. É irreversível.</p>
              <form onSubmit={handleZerarSistema} className="space-y-4">
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-4 py-3 bg-rose-50/50 border border-rose-200 rounded-xl text-center font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20 placeholder:text-rose-300" placeholder="Digite sua senha de admin" />
                {resetError && <p className="text-rose-600 font-bold text-xs bg-rose-50 py-2 rounded-xl">{resetError}</p>}
                <div className="flex gap-3 pt-2">
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} transition={fastTransition} type="submit" disabled={isResetting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-md">{isResetting ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'Apagar Tudo'}</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 INPUT FILE OCULTO (GLOBAL PARA IMPORTAÇÃO) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".txt,.csv"
      />

    </div>
  );
}