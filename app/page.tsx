'use client';

import { useState, useEffect } from 'react';
import { Lock, User, Loader2, AlertCircle, Download, Wifi, WifiOff, UserCheck } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  saveLastUser, 
  getValidLastUser
} from '@/app/utils/offlineAuth';

// --- TIPAGEM CORRETA DO EVENTO PWA ---
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);
  const [lastUserEmail, setLastUserEmail] = useState<string | null>(null);

  // --- PWA STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // --- DETECTAR STATUS DE CONECTIVIDADE ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineFallback(false);
      console.log('[LOGIN] Conexão restabelecida');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[LOGIN] Conexão perdida');
      
      // Verificar se tem usuário offline válido
      getValidLastUser().then(user => {
        if (user) {
          setLastUserEmail(user.email);
          setShowOfflineFallback(true);
          setErrorMsg(null);
        }
      });
    };
    
    setIsOnline(navigator.onLine);
    
    // Verificar fallback offline ao carregar
    if (!navigator.onLine) {
      getValidLastUser().then(user => {
        if (user) {
          setLastUserEmail(user.email);
          setShowOfflineFallback(true);
        }
      });
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- DETECTAR SE ESTÁ RODANDO COMO PWA ---
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isStandalone);
    console.log('[PWA] Rodando em modo:', isStandalone ? 'standalone (instalado)' : 'navegador');
  }, []);

  // Verificar se já está logado usando getSession() (funciona offline)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Salvar último usuário para fallback offline
        await saveLastUser(
          session.user.email || '', 
          session.user.id, 
          session.expires_at || (Date.now() + 3600000)
        );
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router, supabase]);

  // --- CAPTURA EVENTO PWA ---
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      
      evt.preventDefault();
      setDeferredPrompt(evt);
      setShowInstallButton(true);
      
      console.log('[PWA] beforeinstallprompt capturado');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // --- INSTALAR APP ---
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    
    const choice = await deferredPrompt.userChoice;
    console.log('[PWA] escolha:', choice.outcome);

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // 🔥 Continuar offline em modo limitado
  const handleContinueOffline = () => {
    if (lastUserEmail) {
      // 🔥 FIX 5: Aviso antes de entrar no modo limitado
      const confirmed = window.confirm(
        `Você está offline.\n\nEntrando em modo limitado (apenas leitura) como:\n${lastUserEmail}\n\nAs alterações serão sincronizadas quando conectar.`
      );
      if (confirmed) {
        router.push('/dashboard');
      }
    }
  };

  // --- LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (!isOnline) {
      setErrorMsg("❌ Você está offline. Conecte-se à internet para fazer login.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Email ou senha incorretos.");
      setLoading(false);
    } else {
      // Salvar último usuário para fallback offline
      await saveLastUser(
        email, 
        data?.session?.user?.id || '', 
        data?.session?.expires_at || (Date.now() + 3600000)
      );
      
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      <Image 
        src="/fundo.jpg" 
        alt="Imagem de Fundo"
        fill 
        className="object-cover -z-20 grayscale"
        quality={100}
        priority
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] -z-10" />

      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500 z-10 border border-white/95">

        {isPWA && (
          <div className="absolute top-2 right-2 bg-emerald-500/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            App
          </div>
        )}

        <div className="absolute top-2 left-2">
          {isOnline ? (
            <div className="bg-emerald-500/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wifi size={10} />
              Online
            </div>
          ) : (
            <div className="bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <WifiOff size={10} />
              Offline
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden">
            <Image 
              src="/logo.png"       
              alt="Logo Face a Face"
              width={80}
              height={80}
              className="object-cover w-full h-full"
              priority              
            />
          </div>

          <h1 className="text-2xl font-bold text-orange-600">Face a Face</h1>
          <p className="text-orange-600 font-medium text-sm mt-1">
            Sistema de Gestão de Medicação
          </p>
        </div>

        {showInstallButton && (
          <button
            onClick={handleInstall}
            className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <Download size={18} />
            Instalar App
          </button>
        )}

        {/* 🔥 FIX 4: Sugestão inteligente de fallback offline */}
        {showOfflineFallback && !isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-medium">
                  Você está offline, mas pode continuar como:
                </p>
                <p className="text-base font-bold text-amber-900 mt-1">{lastUserEmail}</p>
                <p className="text-xs text-amber-600 mt-1">
                  Modo limitado (apenas leitura)
                </p>
                <button
                  onClick={handleContinueOffline}
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full"
                >
                  Continuar offline como {lastUserEmail?.split('@')[0]}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isOnline && !showOfflineFallback && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <WifiOff className="h-4 w-4" />
            <span>⚠️ Você está offline. Conecte-se para fazer login.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!showOfflineFallback && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !isOnline}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 bg-white/80"
                placeholder="Email"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || !isOnline}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 bg-white/80"
                placeholder="Senha"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading || !isOnline}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Acessar Sistema'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-gray-300/50 pt-6">
          <p className="text-xs text-gray-600 font-medium">
            Igreja Batista Apascentar - Maringá
          </p>
        </div>
      </div>
    </div>
  );
}
