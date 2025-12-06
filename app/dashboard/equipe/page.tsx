'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { listarUsuarios, excluirUsuario, alternarBloqueioUsuario } from '@/app/actions/equipe';
import { Trash2, User, Shield, Loader2, ArrowLeft, Lock, PauseCircle, PlayCircle, Calendar, Clock, AlertTriangle } from 'lucide-react';
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

  // Estados para o Modal de Exclusão
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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

  // 1. Abre o Modal
  const solicitarExclusao = (id: string, email: string) => {
    setUserToDelete({ id, email });
    setDeleteConfirmation('');
  };

  // 2. Executa a exclusão (Chamada pelo Modal)
  const confirmarExclusao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userToDelete) return;
    if (deleteConfirmation !== 'DELETAR') {
        alert("Digite DELETAR corretamente para confirmar.");
        return;
    }

    setProcessingId(userToDelete.id);
    const resultado = await excluirUsuario(userToDelete.id);
    
    if (resultado.success) {
        setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null); // Fecha modal
    } else {
        alert("Erro: " + resultado.message);
    }
    setProcessingId(null);
  };

  const handleTogglePause = async (id: string, isPaused: boolean) => {
    setProcessingId(id);
    const acao = isPaused ? "retomar" : "pausar";
    
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, banned_until: isPaused ? null : '2099-01-01' } : u));

    const resultado = await alternarBloqueioUsuario(id, !isPaused);

    if (!resultado.success) {
        alert("Erro ao " + acao + ": " + resultado.message);
        await carregarEquipe();
    }
    setProcessingId(null);
  };

  const formatarData = (dataIso: string | undefined) => {
    if (!dataIso) return 'Nunca acessou';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2"/> Carregando equipe...</div>;

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-4">
         <div className="max-w-5xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                     <ArrowLeft size={20} />
                 </Link>
                 <div>
                    <h1 className="text-lg font-bold text-slate-800">Gestão de Equipe</h1>
                    <p className="text-xs text-slate-500 hidden sm:block">Gerencie o acesso dos enfermeiros</p>
                 </div>
             </div>
             <div className="bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 text-orange-700 text-xs font-bold flex items-center gap-2">
                <User size={14} /> {usuarios.length} Membros
             </div>
         </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usuarios.map((u) => {
                const isMe = u.id === currentUser;
                const isPaused = u.banned_until && new Date(u.banned_until) > new Date();
                const isProcessing = processingId === u.id;

                return (
                    <div key={u.id} className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 ${isMe ? 'border-orange-200 shadow-md shadow-orange-100' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
                        
                        {/* BADGE DE STATUS NO TOPO */}
                        <div className="absolute top-4 right-4">
                            {isPaused ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">
                                    Pausado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                                    Ativo
                                </span>
                            )}
                        </div>

                        {/* CABEÇALHO DO CARD */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${isMe ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-200' : isPaused ? 'bg-slate-200 shadow-slate-100' : 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-200'}`}>
                                {isMe ? <Shield size={28} /> : <User size={28} />}
                            </div>
                            <div className="overflow-hidden">
                                <p className={`font-bold text-sm truncate ${isPaused ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {u.email}
                                </p>
                                {isMe ? (
                                    <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                                        <Lock size={10} /> Você (Admin)
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400 font-mono">ID: {u.id.slice(0,8)}</span>
                                )}
                            </div>
                        </div>

                        {/* INFORMAÇÕES DE DATA */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 flex items-center gap-1"><Calendar size={12}/> Criado em:</span>
                                <span className="text-slate-600 font-medium">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 flex items-center gap-1"><Clock size={12}/> Último acesso:</span>
                                <span className="text-slate-600 font-medium truncate max-w-[140px] text-right">{formatarData(u.last_sign_in_at)}</span>
                            </div>
                        </div>

                        {/* BOTÕES DE AÇÃO */}
                        {!isMe && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleTogglePause(u.id, !!isPaused)}
                                    disabled={isProcessing}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                        isPaused 
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100' 
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin h-4 w-4"/> : (isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />)}
                                    {isPaused ? 'Retomar' : 'Pausar'}
                                </button>

                                <button 
                                    onClick={() => solicitarExclusao(u.id, u.email || 'Sem email')}
                                    disabled={isProcessing}
                                    className="w-12 flex items-center justify-center rounded-xl bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Revogar Acesso"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                        
                        {isMe && (
                            <div className="py-2.5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                Conta de Administrador Principal
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* --- MODAL DE EXCLUSÃO ESTILIZADO --- */}
        {userToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border-2 border-red-100 text-center animate-in fade-in zoom-in duration-200">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <AlertTriangle className="text-red-500 w-8 h-8" />
                    </div>
                    <h2 className="text-slate-800 font-bold text-xl mb-2">Excluir Membro?</h2>
                    <p className="text-slate-500 text-sm mb-1">
                        Você está prestes a remover o acesso de:
                    </p>
                    <p className="text-slate-800 font-bold mb-6 bg-slate-50 py-1 px-3 rounded-lg inline-block border border-slate-200">
                        {userToDelete.email}
                    </p>
                    
                    <p className="text-xs text-red-600 font-medium mb-4 uppercase tracking-wide">
                        Digite &quot;DELETAR&quot; para confirmar
                    </p>

                    <form onSubmit={confirmarExclusao} className="space-y-4">
                        <div className="relative">
                            <Trash2 className="absolute left-3.5 top-3 h-5 w-5 text-red-300" />
                            <input 
                                type="text" 
                                value={deleteConfirmation} 
                                onChange={e => setDeleteConfirmation(e.target.value)} 
                                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-center text-slate-800 font-bold tracking-widest placeholder-slate-300 uppercase" 
                                placeholder="DELETAR" 
                                autoFocus 
                            />
                        </div>
                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => {setUserToDelete(null); setDeleteConfirmation('')}} 
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={deleteConfirmation !== 'DELETAR' || processingId === userToDelete.id} 
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processingId === userToDelete.id ? <Loader2 className="animate-spin h-5 w-5"/> : 'EXCLUIR'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}