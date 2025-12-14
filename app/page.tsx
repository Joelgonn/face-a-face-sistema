'use client';

import { useState } from 'react';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

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
      
      {/* --- 1. IMAGEM DE FUNDO (Preto e Branco) --- */}
      <Image 
        src="/fundo.jpg" 
        alt="Imagem de Fundo"
        fill 
        className="object-cover -z-20 grayscale" // Grayscale ativado
        quality={100}
        priority
      />

      {/* --- 2. PELÍCULA ESCURA --- */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] -z-10" />

      {/* --- CARTÃO DE VIDRO --- */}
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500 z-10 border border-white/95">
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
          
          {/* --- AQUI ESTÁ A MUDANÇA: Texto mais escuro e levemente negrito --- */}
          <p className="text-orange-600 font-medium text-sm mt-1">
            Sistema de Gestão de Medicação
          </p>

        </div>

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
          {/* Melhorei a cor do rodapé também */}
          <p className="text-xs text-gray-600 font-medium">Igreja Batista Apascentar - Maringá</p>
        </div>
      </div>
    </div>
  );
}