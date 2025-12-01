'use client';

import { useState } from 'react';
import { LogIn, Lock, User, Loader2 } from 'lucide-react'; // Adicionei Loader2
import { createClient } from '@/app/utils/supabase/client'; // Nosso conector
import { useRouter } from 'next/navigation'; // Para trocar de página

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient(); // Liga o conector
  const router = useRouter();      // Prepara o navegador

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Pergunta pro Supabase: "Esse cara existe?"
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro: Email ou senha incorretos.");
      setLoading(false);
    } else {
      // Sucesso! Manda pro dashboard
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-200">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-orange-500">
        <div className="text-center mb-8">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Face a Face</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestão de Medicação</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900" 
              placeholder="Email" 
              required 
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900" 
              placeholder="Senha" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Acessar Sistema'}
          </button>
        </form>
        <div className="mt-8 text-center"><p className="text-xs text-gray-400">Igreja Batista Apascentar - Maringá</p></div>
      </div>
    </div>
  );
}