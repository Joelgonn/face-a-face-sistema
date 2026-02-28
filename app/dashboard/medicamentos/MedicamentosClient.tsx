'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Database } from '@/types/supabase';
import { 
  ArrowLeft, Plus, Search, Save, Loader2, Trash2, 
  Pill, Pencil, X, AlertTriangle, CheckCircle2, Package,
  Hash
} from 'lucide-react';
import Link from 'next/link';

type MedicamentoRow = Database['public']['Tables']['medicamentos']['Row'];

interface MedicamentosClientProps {
  initialMedicamentos: MedicamentoRow[];
}

interface ToastNotification {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function MedicamentosClient({ initialMedicamentos }: MedicamentosClientProps) {
  const [medicamentos, setMedicamentos] = useState<MedicamentoRow[]>(initialMedicamentos);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMed, setCurrentMed] = useState<MedicamentoRow | null>(null); 
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const supabase = createClient();
  
  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3000);
  };

  const abrirModal = (med: MedicamentoRow | null = null) => {
    setCurrentMed(med);
    setNome(med ? med.nome || '' : '');
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);

    if (currentMed) {
        const { error } = await supabase.from('medicamentos').update({ nome }).eq('id', currentMed.id);
        if (!error) {
            setMedicamentos(prev => prev.map(m => m.id === currentMed.id ? { ...m, nome } : m));
            showToast('success', 'Atualizado', 'Medicamento alterado com sucesso.');
            setIsModalOpen(false);
        } else {
            showToast('error', 'Erro', error.message);
        }
    } else {
        const { data, error } = await supabase.from('medicamentos').insert({ nome }).select().single();
        if (!error && data) {
            setMedicamentos(prev => [data, ...prev].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
            showToast('success', 'Criado', 'Medicamento adicionado à base.');
            setIsModalOpen(false);
        } else {
            showToast('error', 'Erro', error.message || 'Erro ao criar');
        }
    }
    setSaving(false);
  };

  const handleExcluir = async (id: number) => {
    const backup = [...medicamentos];
    setMedicamentos(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);

    const { error } = await supabase.from('medicamentos').delete().eq('id', id);
    if (error) {
        setMedicamentos(backup);
        showToast('error', 'Erro ao excluir', 'O medicamento pode estar em uso.');
    } else {
        showToast('success', 'Excluído', 'Medicamento removido da base.');
    }
  };

  const filtered = useMemo(() => 
    medicamentos.filter(m => (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [medicamentos, searchTerm]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      {/* HEADER FIXO PREMIUM */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2 text-slate-400 hover:text-orange-600 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Medicamentos</h1>
                    <p className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest">Base de Autocomplete</p>
                </div>
            </div>
            <button 
                onClick={() => abrirModal()} 
                className="p-2.5 md:px-5 bg-orange-600 rounded-2xl text-white shadow-lg shadow-orange-200 flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95"
            >
                <Plus size={20} />
                <span className="hidden md:inline font-bold">Novo Medicamento</span>
            </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* STATS RÁPIDO (Estilo Relatório) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Package size={24}/>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total na Base</p>
                    <p className="text-2xl font-black text-slate-800">{filtered.length}</p>
                </div>
            </div>
            
            {/* BUSCA PREMIUM */}
            <div className="md:col-span-2 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Buscar medicamento na base..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all"
                />
            </div>
        </div>

        {/* LISTA MOBILE - CARDS PREMIUM */}
        <div className="md:hidden space-y-4">
            {filtered.map((med) => (
                <div key={med.id} className="bg-white rounded-[2rem] border-l-8 border-l-orange-500 shadow-md border border-slate-100 overflow-hidden active:scale-[0.98] transition-transform">
                    <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-orange-600 font-black text-xl border border-slate-100 shadow-sm">
                                {med.nome?.[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg leading-tight">{med.nome}</h3>
                                <div className="flex items-center gap-1 text-slate-400 mt-1">
                                    <Hash size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">ID: {med.id}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => abrirModal(med)} className="p-3 bg-slate-50 text-slate-400 rounded-xl active:bg-orange-100 active:text-orange-600 transition-colors">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => setDeletingId(med.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl active:bg-red-100 active:text-red-600 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* TABELA DESKTOP - ESTILO RELATÓRIO */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                        <th className="p-6">Medicamento</th>
                        <th className="p-6">ID Sistema</th>
                        <th className="p-6 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filtered.map((med) => (
                        <tr key={med.id} className="hover:bg-orange-50/30 transition-all group">
                            <td className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-orange-600 font-black">{med.nome?.[0].toUpperCase()}</div>
                                    <span className="font-bold text-slate-800 text-lg">{med.nome}</span>
                                </div>
                            </td>
                            <td className="p-6 text-slate-400 font-mono text-xs tracking-widest">#{med.id}</td>
                            <td className="p-6">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => abrirModal(med)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-orange-600 shadow-sm transition-all border border-transparent hover:border-slate-100">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={() => setDeletingId(med.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 shadow-sm transition-all border border-transparent hover:border-slate-100">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <Pill size={40} />
                </div>
                <p className="text-slate-400 font-bold text-lg">Nenhum medicamento encontrado</p>
            </div>
        )}
      </main>

      {/* MODAL ADICIONAR / EDITAR - ESTILO PREMIUM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white rounded-t-[3rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">{currentMed ? 'Editar' : 'Novo'}</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações do Medicamento</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 transition-colors"><X size={24}/></button>
                </div>
                <form onSubmit={handleSalvar} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Nome Comercial ou Genérico</label>
                        <input 
                            type="text" 
                            required 
                            value={nome} 
                            onChange={e => setNome(e.target.value)} 
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-slate-800 font-bold text-lg transition-all" 
                            placeholder="Ex: Amoxicilina 500mg" 
                            autoFocus 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-orange-200 disabled:opacity-70 transition-all flex justify-center items-center gap-3 active:scale-[0.97]"
                    >
                        {saving ? <Loader2 className="animate-spin h-6 w-6"/> : <><Save size={22}/> Salvar Registro</>}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO - ESTILO PREMIUM */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200 border-b-8 border-red-500">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="text-red-500 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Excluir?</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Você está prestes a remover este item da base. Esta ação não afetará registros passados, apenas o autocomplete futuro.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setDeletingId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button onClick={() => handleExcluir(deletingId)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Excluir</button>
                </div>
            </div>
        </div>
      )}

      {/* TOAST NOTIFICATION (Estilo Floating Air) */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300 w-[90%] max-w-md">
          <div className={`flex items-center gap-4 p-5 rounded-[2rem] shadow-2xl border backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-600/95 border-emerald-400 text-white' : 'bg-red-600/95 border-red-400 text-white'}`}>
            <div className="p-2 bg-white/20 rounded-xl">
              {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-sm uppercase tracking-wider">{toast.title}</h4>
              <p className="text-xs font-bold opacity-90 leading-tight">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}