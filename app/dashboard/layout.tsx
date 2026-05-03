'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { 
  Loader2, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Lock,
  Home,
  FileText,
  Pill,
  Upload,
  Trash2,
  Menu,
  ArrowLeft,
  Users
} from 'lucide-react';
import { 
  saveLastUser, 
  getValidLastUser, 
  clearLastUser 
} from '@/app/utils/offlineAuth';
import { PrefetchLinks } from '@/app/components/PrefetchLinks';
import { OfflineNavigationGuard } from '@/app/components/OfflineNavigationGuard';
import { useOfflineNavigation } from '@/app/hooks/useOfflineNavigation';
import Image from 'next/image';
import { saveLocalSession, clearLocalSession, getLocalSession } from '@/app/lib/localAuth';
import { useSwipeSidebar } from '@/app/hooks/useSwipeSidebar';

// ============================================================
// CONTEXTO PARA AÇÕES DO DASHBOARD
// ============================================================
type DashboardActionsContextType = {
  onImport: (() => void) | null;
  onReset: (() => void) | null;
  setOnImport: (fn: () => void) => void;
  setOnReset: (fn: () => void) => void;
};

const DashboardActionsContext = createContext<DashboardActionsContextType | null>(null);

export function useDashboardActions() {
  const ctx = useContext(DashboardActionsContext);
  if (!ctx) throw new Error('useDashboardActions must be used within DashboardActionsProvider');
  return ctx;
}

function DashboardActionsProvider({ children }: { children: React.ReactNode }) {
  const [onImport, setOnImport] = useState<(() => void) | null>(null);
  const [onReset, setOnReset] = useState<(() => void) | null>(null);

  return (
    <DashboardActionsContext.Provider value={{ onImport, onReset, setOnImport, setOnReset }}>
      {children}
    </DashboardActionsContext.Provider>
  );
}

// ============================================================
// READ-ONLY MODE CONTEXT
// ============================================================
export const ReadOnlyContext = React.createContext<boolean>(false);
export function useReadOnlyMode() { return React.useContext(ReadOnlyContext); }
export function useIsOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOffline;
}

// ============================================================
// SIDEBAR (ESTRUTURA PURA, SEM RESPONSIVIDADE DE LARGURA)
// ============================================================
function Sidebar({ readOnlyMode, isOnline, onClose, navigateTo }: { 
  readOnlyMode: boolean; 
  isOnline: boolean; 
  onClose?: () => void;
  navigateTo: (url: string) => void;
}) {
  const [currentPath, setCurrentPath] = useState('');
  const { onImport, onReset } = useDashboardActions();
  
  // Atualiza o caminho atual com listener de navegação (inclusive offline)
  useEffect(() => {
    const updatePath = () => setCurrentPath(window.location.pathname);
    updatePath();
    window.addEventListener('popstate', updatePath);
    return () => {
      window.removeEventListener('popstate', updatePath);
    };
  }, []);
  
  const handleImport = () => {
    if (onImport) onImport();
    onClose?.();
  };
  
  const handleReset = () => {
    if (onReset) onReset();
    onClose?.();
  };
  
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, group: 'main' },
    { href: '/dashboard/equipe', label: 'Equipe', icon: Users, group: 'main' },
    { href: '/dashboard/relatorio', label: 'Relatórios', icon: FileText, group: 'secondary' },
    { href: '/dashboard/medicamentos', label: 'Farmácia', icon: Pill, group: 'secondary' },
  ];
  
  const mainItems = navItems.filter(item => item.group === 'main');
  const secondaryItems = navItems.filter(item => item.group === 'secondary');
  
  // Largura fixa para desktop (nunca usar responsivo aqui)
  return (
    <aside className="w-64 bg-white border-r border-gray-200 shadow-lg flex-shrink-0 h-full overflow-y-auto overscroll-contain flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-orange-600 text-sm">Face a Face</h1>
              <div className="flex items-center gap-1 mt-0.5">
                {isOnline ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-amber-500" />}
                <span className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Fechar menu"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col p-2">
        <div className="space-y-0.5">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href || currentPath?.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => { navigateTo(item.href); onClose?.(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {secondaryItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-0.5">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href || currentPath?.startsWith(item.href + '/');
              return (
                <button
                  key={item.href}
                  onClick={() => { navigateTo(item.href); onClose?.(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 space-y-0.5">
          <button
            onClick={handleImport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-left"
          >
            <Upload size={18} />
            <span className="text-sm font-medium">Importar</span>
          </button>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors text-left"
          >
            <Trash2 size={18} />
            <span className="text-sm font-medium">Zerar</span>
          </button>
        </div>
      </nav>
      
      {readOnlyMode && (
        <div className="p-3 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
            <Lock size={14} className="text-amber-500 mx-auto mb-0.5" />
            <p className="text-xs text-amber-600">Modo leitura</p>
          </div>
        </div>
      )}
    </aside>
  );
}

// ============================================================
// LAYOUT PRINCIPAL (COM MANIPULAÇÃO DE ERROS OFFLINE)
// ============================================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [degradedMode, setDegradedMode] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  
  // Estado do sidebar com persistência
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar_open') === 'true';
  });
  
  const { navigateTo, goBack } = useOfflineNavigation();
  const supabase = createClient();

  // Bloquear scroll do body quando sidebar aberta
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Persistir estado do sidebar
  useEffect(() => {
    localStorage.setItem('sidebar_open', String(sidebarOpen));
  }, [sidebarOpen]);

  // Swipe gesture com feedback tátil (passive: true já no hook)
  useSwipeSidebar({
    isOpen: sidebarOpen,
    onOpen: () => {
      navigator.vibrate?.(10);
      setSidebarOpen(true);
    },
    onClose: () => setSidebarOpen(false),
  });

  // Sessão local (online/offline sync)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        saveLocalSession(session);
      } else {
        clearLocalSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Detectar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================================
  // AUTENTICAÇÃO COM SUPRESSÃO DE ERROS OFFLINE (FIX)
  // ============================================================
  useEffect(() => {
    const checkAuth = async () => {
      // 1. Tenta obter sessão do Supabase, silenciando erros quando offline
      let session = null;
      let authError = null;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        session = data.session;
      } catch (err) {
        authError = err;
        if (!navigator.onLine) {
          // Log silencioso em produção, apenas para debug
          if (process.env.NODE_ENV === 'development') {
            console.log('[AUTH] Offline, ignorando erro de sessão');
          }
        } else {
          console.error('[AUTH] Erro real ao buscar sessão:', err);
        }
      }

      // Se obteve sessão online, autentica normalmente
      if (session?.user) {
        console.log('[DASHBOARD] Usuário autenticado:', session.user.email);
        await saveLastUser(session.user.email || '', session.user.id, session.expires_at || (Date.now() + 3600000));
        setIsAuthenticated(true);
        setDegradedMode(false);
        setReadOnlyMode(false);
        setIsLoading(false);
        return;
      }

      // 2. Fallback offline: sessão local via IndexedDB/localStorage
      if (!navigator.onLine || authError) {
        const local = getLocalSession();
        if (local) {
          console.log('[AUTH] Sessão local usada offline para:', local.user.email);
          setIsAuthenticated(true);
          setDegradedMode(true);
          setReadOnlyMode(true);
          setIsLoading(false);
          return;
        }

        const validLastUser = await getValidLastUser();
        if (validLastUser) {
          console.log('[DASHBOARD] Modo degradado offline para:', validLastUser.email);
          setIsAuthenticated(true);
          setDegradedMode(true);
          setReadOnlyMode(true);
          setIsLoading(false);
          return;
        }

        console.log('[DASHBOARD] Offline e sem sessão local - não é possível operar');
        setIsAuthenticated(false);
        setDegradedMode(false);
        setReadOnlyMode(false);
        setIsLoading(false);
        return;
      }

      // 3. Online sem sessão: redireciona para login
      console.log('[DASHBOARD] Online sem sessão, redirecionando para login');
      clearLastUser();
      navigateTo('/');
    };

    checkAuth();
  }, [supabase, isOnline, navigateTo]);

  // Estados de carregamento e erro offline
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="mt-4 text-gray-600 text-sm">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated && isOnline) return null;

  if (!isAuthenticated && !isOnline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <WifiOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Você está offline</h2>
          <p className="text-red-600 mb-4">Conecte-se à internet para acessar o sistema.</p>
          <button onClick={() => window.location.reload()} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardActionsProvider>
      <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
        <PrefetchLinks />
        <OfflineNavigationGuard />

        {/* SIDEBAR DESKTOP – sempre visível, largura fixa w-64 */}
        <div className="hidden md:block">
          <Sidebar readOnlyMode={readOnlyMode} isOnline={isOnline} navigateTo={navigateTo} />
        </div>

        {/* SIDEBAR MOBILE – wrapper com largura responsiva, animação e overlay */}
        <div
          className={`
            fixed left-0 top-0 bottom-0 z-50 md:hidden
            w-[85vw] max-w-[300px]
            transform transition-transform duration-300 ease-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar readOnlyMode={readOnlyMode} isOnline={isOnline} navigateTo={navigateTo} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Overlay mobile com pointer-events correto */}
        <div
          className={`
            fixed inset-0 z-40 md:hidden
            bg-black/40 backdrop-blur-sm
            transition-opacity duration-300
            ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
          onClick={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30 md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => {
                  navigator.vibrate?.(10);
                  setSidebarOpen(true);
                }}
                className="p-2.5 rounded-xl active:scale-95 transition-colors hover:bg-gray-100"
                aria-label="Abrir menu"
              >
                <Menu size={22} className="text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" />
                </div>
                <span className="font-medium text-orange-600 text-sm">Face a Face</span>
              </div>
              <button
                onClick={() => goBack()}
                className="p-2.5 rounded-lg hover:bg-gray-100 active:scale-95 transition"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-x-hidden touch-pan-y">
            {readOnlyMode && (
              <div className="mb-4 bg-amber-500 text-white text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <Lock size={14} /><span className="flex-1"><strong>Modo leitura apenas</strong> — Conecte-se para fazer alterações.</span>
                <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Reconectar</button>
              </div>
            )}
            {degradedMode && !readOnlyMode && (
              <div className="mb-4 bg-amber-500 text-white text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} /><span className="flex-1"><strong>Modo offline limitado</strong> — Alterações serão sincronizadas quando conectar.</span>
                <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Sincronizar</button>
              </div>
            )}
            {!isOnline && !degradedMode && !readOnlyMode && (
              <div className="mb-4 bg-yellow-500 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                <WifiOff size={14} /><span>Modo offline – alterações serão sincronizadas quando conectar</span>
              </div>
            )}

            <ReadOnlyContext.Provider value={readOnlyMode}>
              {children}
            </ReadOnlyContext.Provider>
          </main>
        </div>
      </div>
    </DashboardActionsProvider>
  );
}