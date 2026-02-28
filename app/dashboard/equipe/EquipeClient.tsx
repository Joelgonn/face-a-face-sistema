'use client';

import { useState } from 'react';
import { excluirUsuario, alternarBloqueioUsuario } from '@/app/actions/equipe';
import { 
  Trash2, User, Shield, Loader2, ArrowLeft, Lock, 
  PauseCircle, PlayCircle, Calendar, Clock, AlertTriangle, Users
} from 'lucide-react';
import Link from 'next/link';

// Tipo do usuário retornado pelo Supabase
interface Usuario {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
}

interface EquipeClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialUsuarios: any[]; // Usando any para compatibilidade com o retorno do seu action
  currentUser: string | null;
}

export default function EquipeClient({ initialUsuarios, currentUser }: EquipeClientProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estados para o Modal de Exclusão
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // 1. Abre o Modal
  const solicitarExclusao = (id: string, email: string) => {
    setUserToDelete({ id, email });
    setDeleteConfirmation('');
  };

  // 2. Executa a exclusão (Chamada pelo Modal)
  const confirmarExclusao = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userToDelete) return;
    
    // CORREÇÃO AQUI: Ignora espaços e deixa tudo maiúsculo para validar
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETAR') return;

    setProcessingId(userToDelete.id);
    const resultado = await excluirUsuario(userToDelete.id);
    
    if (resultado.success) {
        setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null); 
    } else {
        alert("Erro: " + resultado.message);
    }
    setProcessingId(null);
};

  // 3. Pausar/Retomar Acesso
  const handleTogglePause = async (id: string, isPaused: boolean) => {
    setProcessingId(id);
    
    // Atualização otimista na tela (parece instantâneo para o usuário)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, banned_until: isPaused ? null : '2099-01-01' } : u));

    const resultado = await alternarBloqueioUsuario(id, !isPaused);

    if (!resultado.success) {
        alert("Erro na operação: " + resultado.message);
        // Se falhar, você idealmente recarregaria os dados ou reverteria o estado aqui
    }
    setProcessingId(null);
  };

  const formatarData = (dataIso: string | undefined) => {
    if (!dataIso) return 'Nunca acessou';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      {/* --- HEADER FIXO PREMIUM --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">Gestão de Equipe</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5 hidden sm:block">Gerencie o acesso do seu time</p>
                </div>
            </div>
            
            <div className="bg-slate-100 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-inner">
                <Users size={16} className="text-orange-500" /> 
                <span className="hidden sm:inline">Membros:</span> {usuarios.length}
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* GRID DE CARDS DA EQUIPE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {usuarios.map((u) => {
                const isMe = u.id === currentUser;
                const isPaused = u.banned_until && new Date(u.banned_until) > new Date();
                const isProcessing = processingId === u.id;

                return (
                    <div key={u.id} className={`relative bg-white rounded-[2rem] p-6 border transition-all duration-300 group ${isMe ? 'border-orange-200 shadow-md shadow-orange-500/10' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'}`}>
                        
                        {/* BADGE DE STATUS NO TOPO */}
                        <div className="absolute top-5 right-5">
                            {isPaused ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest">
                                    Pausado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                                    Ativo
                                </span>
                            )}
                        </div>

                        {/* CABEÇALHO DO CARD */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner ${isMe ? 'bg-orange-100 text-orange-600 border border-orange-200' : isPaused ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-slate-800 text-white shadow-slate-900/20'}`}>
                                {isMe ? <Shield size={28} /> : <User size={28} />}
                            </div>
                            <div className="overflow-hidden pr-16"> {/* pr-16 para não encostar no badge */}
                                <p className={`font-black text-lg truncate ${isPaused ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {u.email}
                                </p>
                                {isMe ? (
                                    <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                        <Lock size={12} /> Você (Admin)
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">ID: {u.id.slice(0,8)}</span>
                                )}
                            </div>
                        </div>

                        {/* INFORMAÇÕES DE DATA */}
                        <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-3 border border-slate-100">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14}/> Criado em:</span>
                                <span className="text-slate-700 font-bold">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={14}/> Último acesso:</span>
                                <span className="text-slate-700 font-bold truncate max-w-[140px] text-right">{formatarData(u.last_sign_in_at)}</span>
                            </div>
                        </div>

                        {/* BOTÕES DE AÇÃO */}
                        {!isMe && (
                            <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                                <button 
                                    onClick={() => handleTogglePause(u.id, !!isPaused)}
                                    disabled={isProcessing}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        isPaused 
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-100 hover:shadow-lg hover:shadow-emerald-600/30' 
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-100 hover:shadow-lg hover:shadow-amber-500/30'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin h-4 w-4"/> : (isPaused ? <PlayCircle size={16} /> : <PauseCircle size={16} />)}
                                    {isPaused ? 'Liberar Acesso' : 'Pausar Acesso'}
                                </button>

                                <button 
                                    onClick={() => solicitarExclusao(u.id, u.email || 'Sem email')}
                                    disabled={isProcessing}
                                    className="w-12 flex items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-600 hover:text-white hover:shadow-lg hover:shadow-rose-600/30 transition-all"
                                    title="Excluir Usuário"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                        
                        {isMe && (
                            <div className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 rounded-xl border border-orange-100 border-dashed">
                                Conta Master
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* --- MODAL DE EXCLUSÃO PREMIUM --- */}
        {userToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-rose-100 text-center zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="text-rose-500 w-10 h-10" />
                    </div>
                    
                    <h2 className="text-slate-800 font-black text-2xl mb-2">Excluir Membro?</h2>
                    <p className="text-slate-500 font-medium mb-1">Você está prestes a remover o acesso de:</p>
                    <p className="text-slate-800 font-black text-lg mb-8 bg-slate-50 py-2 px-4 rounded-xl border border-slate-200 truncate">
                        {userToDelete.email}
                    </p>
                    
                    <p className="text-[10px] text-rose-500 font-black mb-2 uppercase tracking-widest">
                        Digite <span className="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">DELETAR</span> para confirmar
                    </p>

                    <form onSubmit={confirmarExclusao} className="space-y-5">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={deleteConfirmation} 
                                onChange={e => setDeleteConfirmation(e.target.value)} 
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 focus:bg-white text-center text-slate-800 font-black tracking-widest placeholder-slate-300 uppercase transition-all" 
                                placeholder="DELETAR" 
                                autoFocus 
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => {setUserToDelete(null); setDeleteConfirmation('')}} 
                                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                // CORREÇÃO AQUI
                                disabled={deleteConfirmation.trim().toUpperCase() !== 'DELETAR' || processingId === userToDelete.id} 
                                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {processingId === userToDelete.id ? <Loader2 className="animate-spin h-6 w-6"/> : 'EXCLUIR'}
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