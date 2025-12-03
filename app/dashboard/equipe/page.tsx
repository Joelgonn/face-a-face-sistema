'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { listarUsuarios, excluirUsuario, alternarBloqueioUsuario } from '@/app/actions/equipe';
import { Trash2, User, Shield, Loader2, ArrowLeft, Lock, PauseCircle, PlayCircle } from 'lucide-react';
import Link from 'next/link';

// Tipo do usuário retornado pelo Supabase
interface Usuario {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
}

export default function GestaoEquipe() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  const carregarEquipe = async () => {
    try {
      const lista = await listarUsuarios();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsuarios(lista as any);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      await carregarEquipe();
      setLoading(false);
    }
    init();
  }, [supabase]);

  const handleDelete = async (id: string, email: string) => {
    const confirmacao = prompt(`Para excluir ${email}, digite "DELETAR" abaixo:\n(Isso apaga a conta permanentemente)`);
    if (confirmacao !== "DELETAR") return;

    setProcessingId(id);
    const resultado = await excluirUsuario(id);
    
    if (resultado.success) {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        alert("Enfermeiro removido com sucesso.");
    } else {
        alert("Erro: " + resultado.message);
    }
    setProcessingId(null);
  };

  const handleTogglePause = async (id: string, isPaused: boolean) => {
    setProcessingId(id);
    const acao = isPaused ? "retomar" : "pausar";
    
    // Atualiza visualmente primeiro (Otimista)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, banned_until: isPaused ? null : '2099-01-01' } : u));

    const resultado = await alternarBloqueioUsuario(id, !isPaused);

    if (!resultado.success) {
        alert("Erro ao " + acao + ": " + resultado.message);
        await carregarEquipe();
    }
    setProcessingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2"/> Carregando equipe...</div>;

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-orange-600 mb-2 font-medium transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel
                </Link>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="text-orange-600" /> Gestão de Acesso
                </h1>
                <p className="text-gray-500 text-sm">Controle quem tem acesso ao sistema neste encontro.</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 text-right hidden sm:block">
                <p className="text-xs text-gray-400 uppercase font-bold">Total de Acessos</p>
                <p className="text-2xl font-bold text-orange-600">{usuarios.length}</p>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-600">Usuário</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Último Acesso</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-right w-64">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usuarios.map((u) => {
                            const isMe = u.id === currentUser;
                            const isPaused = u.banned_until && new Date(u.banned_until) > new Date();
                            const isProcessing = processingId === u.id;

                            return (
                                <tr key={u.id} className={`transition-colors ${isPaused ? 'bg-gray-50' : 'hover:bg-orange-50/30'}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-orange-100 text-orange-600' : isPaused ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {isMe ? <Shield size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <p className={`font-medium flex items-center gap-2 ${isPaused ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {u.email}
                                                    {isMe && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 no-underline">VOCÊ</span>}
                                                </p>
                                                <p className="text-xs text-gray-400 font-mono">{u.id.slice(0,8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {isPaused ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                <PauseCircle size={12} /> Pausado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                <PlayCircle size={12} /> Ativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') + ' ' + new Date(u.last_sign_in_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Nunca'}
                                    </td>
                                    <td className="p-4 text-right">
                                        {isMe ? (
                                            <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1"><Lock size={12}/> Admin Principal</span>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleTogglePause(u.id, !!isPaused)}
                                                    disabled={isProcessing}
                                                    className={`inline-flex items-center justify-center w-10 h-9 rounded-lg border transition-colors disabled:opacity-50
                                                        ${isPaused 
                                                            ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' 
                                                            : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100'
                                                        }`}
                                                    title={isPaused ? "Retomar Acesso" : "Pausar Acesso"}
                                                >
                                                    {isProcessing ? <Loader2 className="animate-spin h-4 w-4"/> : (isPaused ? <PlayCircle size={18} /> : <PauseCircle size={18} />)}
                                                </button>

                                                <button 
                                                    onClick={() => handleDelete(u.id, u.email || 'Sem email')}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center justify-center w-10 h-9 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    title="Revogar Acesso Permanentemente"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}