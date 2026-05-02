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
  ArrowLeft
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

// ============================================================
// 🔥 CONTEXTO PARA AÇÕES DO DASHBOARD
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
// 🔥 READ-ONLY MODE CONTEXT
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
// 🔥 SIDEBAR
// ============================================================
function Sidebar({ readOnlyMode, isOnline, onClose, navigateTo }: { 
  readOnlyMode: boolean; 
  isOnline: boolean; 
  onClose?: () => void;
  navigateTo: (url: string) => void;
}) {
  const [currentPath, setCurrentPath] = useState('');
  const { onImport, onReset } = useDashboardActions();
  
  useEffect(() => {
    setCurrentPath(window.location.pathname);
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
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/relatorio', label: 'Relatórios', icon: FileText },
    { href: '/dashboard/medicamentos', label: 'Farmácia', icon: Pill },
  ];
  
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-orange-600">Face a Face</h1>
            <div className="flex items-center gap-1 mt-0.5">
              {isOnline ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-amber-500" />}
              <span className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href || currentPath?.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => { navigateTo(item.href); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}

        <div className="h-px bg-gray-200 my-2" />

        <button
          onClick={handleImport}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-left"
        >
          <Upload size={18} />
          <span className="text-sm font-medium">Importar</span>
        </button>

        <button
          onClick={handleReset}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors text-left"
        >
          <Trash2 size={18} />
          <span className="text-sm font-medium">Zerar</span>
        </button>
      </nav>
      
      {readOnlyMode && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
            <Lock size={14} className="text-amber-500 mx-auto mb-1" />
            <p className="text-xs text-amber-600">Modo leitura</p>
          </div>
        </div>
      )}
    </aside>
  );
}

// ============================================================
// 🔥 LAYOUT PRINCIPAL
// ============================================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [degradedMode, setDegradedMode] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { navigateTo, goBack } = useOfflineNavigation();
  const supabase = createClient();

  // ============================================================
  // 🔥 SALVAR SESSÃO LOCAL SEMPRE QUE O ESTADO DE AUTENTICAÇÃO MUDAR
  // ============================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        saveLocalSession(session);
      } else {
        clearLocalSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  // Verificar autenticação com fallback offline priorizando sessão local
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 🔥 1. Tenta sessão online via cookie/Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('[DASHBOARD] Usuário autenticado:', session.user.email);
          await saveLastUser(session.user.email || '', session.user.id, session.expires_at || (Date.now() + 3600000));
          setIsAuthenticated(true);
          setDegradedMode(false);
          setReadOnlyMode(false);
          setIsLoading(false);
          return;
        }
        
        // 🔥 2. Offline: prioriza sessão local (IndexedDB/localStorage)
        if (!isOnline) {
          const local = getLocalSession();
          if (local) {
            console.log('[AUTH] Sessão local usada offline para:', local.user.email);
            setIsAuthenticated(true);
            setDegradedMode(true);
            setReadOnlyMode(true);
            setIsLoading(false);
            return;
          }

          // fallback para o antigo offlineAuth (lastUser)
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
        
      } catch (error) {
        console.error('[DASHBOARD] Erro ao verificar sessão:', error);
        
        if (!isOnline) {
          const local = getLocalSession();
          if (local) {
            setIsAuthenticated(true);
            setDegradedMode(true);
            setReadOnlyMode(true);
            setIsLoading(false);
            return;
          }
          const validLastUser = await getValidLastUser();
          if (validLastUser) {
            setIsAuthenticated(true);
            setDegradedMode(true);
            setReadOnlyMode(true);
            setIsLoading(false);
            return;
          }
        }
        
        if (isOnline) {
          clearLastUser();
          navigateTo('/');
        } else {
          setIsAuthenticated(false);
          setReadOnlyMode(false);
        }
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase, isOnline, navigateTo]);

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
      <div className="min-h-screen bg-gray-50 flex">
        <PrefetchLinks />
        <OfflineNavigationGuard />

        <div className="hidden md:block">
          <Sidebar readOnlyMode={readOnlyMode} isOnline={isOnline} navigateTo={navigateTo} />
        </div>

        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden">
              <Sidebar readOnlyMode={readOnlyMode} isOnline={isOnline} navigateTo={navigateTo} onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30 md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100"><Menu size={20} /></button>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                  <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" />
                </div>
                <span className="font-medium text-orange-600 text-sm">Face a Face</span>
              </div>
              <button onClick={() => goBack()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
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