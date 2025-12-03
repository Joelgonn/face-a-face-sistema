'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { listarUsuarios, excluirUsuario } from '@/app/actions/equipe';
import { Trash2, User, Shield, Loader2, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

// Tipo do usuário retornado pelo Supabase
interface Usuario {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function GestaoEquipe() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. Pega o ID do usuário logado (para não se auto-excluir)
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);

      // 2. Busca a lista de todos os usuários via Server Action
      try {
        const lista = await listarUsuarios();
        setUsuarios(lista);
      } catch (error) {
        console.error("Erro ao listar equipe:", error);
        alert("Erro ao carregar equipe. Verifique a chave de serviço.");
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleDelete = async (id: string, email: string) => {
    const confirmacao = prompt(`Para excluir ${email}, digite "DELETAR" abaixo:`);
    if (confirmacao !== "DELETAR") return;

    setDeletingId(id);
    const resultado = await excluirUsuario(id);
    
    if (resultado.success) {
        // Remove da lista localmente para feedback instantâneo
        setUsuarios(prev => prev.filter(u => u.id !== id));
        alert("Enfermeiro removido! O acesso dele foi revogado.");
    } else {
        alert("Erro: " + resultado.message);
    }
    setDeletingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2"/> Carregando equipe...</div>;

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
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
                            <th className="p-4 text-sm font-semibold text-gray-600">Cadastro</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Último Acesso</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usuarios.map((u) => {
                            const isMe = u.id === currentUser;
                            return (
                                <tr key={u.id} className={`hover:bg-orange-50/30 transition-colors ${isMe ? 'bg-orange-50/50' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {isMe ? <Shield size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 flex items-center gap-2">
                                                    {u.email}
                                                    {isMe && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">VOCÊ</span>}
                                                </p>
                                                <p className="text-xs text-gray-400 font-mono">{u.id.slice(0,8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') + ' ' + new Date(u.last_sign_in_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Nunca'}
                                    </td>
                                    <td className="p-4 text-right">
                                        {isMe ? (
                                            <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1"><Lock size={12}/> Admin Principal</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleDelete(u.id, u.email || 'Sem email')}
                                                disabled={deletingId === u.id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50"
                                            >
                                                {deletingId === u.id ? <Loader2 className="animate-spin h-4 w-4"/> : <Trash2 size={16} />}
                                                {deletingId === u.id ? 'Removendo...' : 'Revogar Acesso'}
                                            </button>
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