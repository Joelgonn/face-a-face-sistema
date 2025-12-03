'use client';

import { useState } from 'react';
import { UserPlus, Lock, Mail, Key, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/app/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState(''); // Proteção contra intrusos
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  // Defina aqui sua senha mestra para permitir cadastros
  const CODIGO_MESTRA = "faceafacemedicacao"; 

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    // 1. Verifica o código de segurança
    if (accessCode !== CODIGO_MESTRA) {
        setMsg({ type: 'error', text: 'Código de acesso inválido. Você não tem permissão.' });
        setLoading(false);
        return;
    }

    // 2. Tenta criar o usuário no Supabase
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Cadastro realizado com sucesso! Redirecionando...' });
      // Opcional: Login automático ou redirecionar
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-orange-100">
        
        <Link href="/" className="flex items-center text-sm text-gray-500 hover:text-orange-600 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Login
        </Link>

        <div className="text-center mb-8">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Novo Enfermeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Cadastro restrito da equipe</p>
        </div>

        {msg && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {msg.type === 'error' ? <Lock className="h-4 w-4"/> : <ShieldCheck className="h-4 w-4"/>}
                {msg.text}
            </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-5">
          {/* Campo de Código de Segurança */}
          <div className="relative group">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Código Mestre</label>
            <div className="absolute inset-y-0 left-0 pl-3 top-6 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input 
              type="text" 
              value={accessCode} 
              onChange={(e) => setAccessCode(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900" 
              placeholder="Senha da equipe..." 
              required 
            />
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900" 
              placeholder="Email do Enfermeiro" 
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
              placeholder="Crie uma senha" 
              required 
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Cadastrar Acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}