'use client';

import { useState } from 'react';
import { Lock, Mail, Key, ArrowLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Importamos o Image
import { cadastrarEnfermeiro } from '@/app/actions/auth';

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const router = useRouter();

  const handleCadastro = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMsg(null);

    const formData = new FormData(event.currentTarget);
    const resultado = await cadastrarEnfermeiro(formData);

    if (resultado.success) {
      setMsg({ type: 'success', text: resultado.message });
      setTimeout(() => {
        router.push('/'); 
      }, 2000);
    } else {
      setMsg({ type: 'error', text: resultado.message });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* --- 1. IMAGEM DE FUNDO (Igual ao Login) --- */}
      <Image 
        src="/fundo.jpg" 
        alt="Imagem de Fundo"
        fill 
        className="object-cover -z-20 grayscale" 
        quality={100}
        priority
      />

      {/* --- 2. PELÍCULA ESCURA --- */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] -z-10" />

      {/* --- CARTÃO DE VIDRO --- */}
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500 z-10 border border-white/95">
        
        {/* Botão Voltar (Ajustado para cor clara) */}
        <Link href="/" className="flex items-center text-sm text-gray-200 hover:text-orange-400 mb-6 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Login
        </Link>

        <div className="text-center mb-8">
          {/* Logo Container */}
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden">
            <Image 
              src="/logo.png"       
              alt="Logo"
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-orange-600">Novo Encontreiro</h1>
          <p className="text-orange-600 font-medium text-sm mt-1">Cadastro restrito da equipe</p>
        </div>

        {/* Mensagens de Erro/Sucesso */}
        {msg && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {msg.type === 'error' ? <AlertCircle className="h-4 w-4"/> : <ShieldCheck className="h-4 w-4"/>}
                {msg.text}
            </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-5">
          {/* Campo de Código de Segurança */}
          <div className="relative group">
             {/* Label ajustado para branco para ler no fundo escuro */}
             <label className="block text-xs font-bold text-gray-200 uppercase mb-1 ml-1">Código Mestre</label>
            <div className="absolute inset-y-0 left-0 pl-3 top-6 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              name="accessCode" 
              type="password" 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 bg-white/80" 
              placeholder="Senha da equipe..." 
              required 
            />
          </div>

          <div className="border-t border-gray-400/30 my-4"></div>

          {/* Email */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              name="email"
              type="email" 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 bg-white/80" 
              placeholder="Email do Enfermeiro" 
              required 
            />
          </div>
          
          {/* Senha */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              name="password"
              type="password" 
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 bg-white/80" 
              placeholder="Crie uma senha" 
              required 
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Cadastrar Acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}