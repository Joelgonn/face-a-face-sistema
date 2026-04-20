'use client';

import { useState, useEffect } from 'react';
import { Lock, User, Loader2, AlertCircle, Download } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

  // --- PWA STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // --- DETECTAR SE ESTÁ RODANDO COMO PWA ---
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isStandalone);
    console.log('[PWA] Rodando em modo:', isStandalone ? 'standalone (instalado)' : 'navegador');
  }, []);

  // --- VERIFICAR SE USUÁRIO JÁ ESTÁ LOGADO ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkUser();
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

  // --- LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Email ou senha incorretos.");
      setLoading(false);
    } else {
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* BACKGROUND */}
      <Image 
        src="/fundo.jpg" 
        alt="Imagem de Fundo"
        fill 
        className="object-cover -z-20 grayscale"
        quality={100}
        priority
      />

      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] -z-10" />

      {/* CARD */}
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500 z-10 border border-white/95">

        {/* INDICADOR DE MODO PWA */}
        {isPWA && (
          <div className="absolute top-2 right-2 bg-emerald-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">
            App
          </div>
        )}

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

        {/* BOTÃO INSTALAR PWA */}
        {showInstallButton && (
          <button
            onClick={handleInstall}
            className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <Download size={18} />
            Instalar App
          </button>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
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
              disabled={loading}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 bg-white/80"
              placeholder="Senha"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-300/50 pt-6">
          <p className="text-xs text-gray-600 font-medium">
            Igreja Batista Apascentar - Maringá
          </p>
        </div>
      </div>
    </div>
  );
}