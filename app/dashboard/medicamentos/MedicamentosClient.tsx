'use client';

import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Database } from '@/types/supabase';
import { 
  ArrowLeft, Plus, Search, Save, Loader2, Trash2, 
  Pill, Pencil, X, AlertTriangle, CheckCircle2, Package 
} from 'lucide-react';
import Link from 'next/link';

// --- TIPAGEM ---
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
        // EDIÇÃO
        const { error } = await supabase
            .from('medicamentos')
            .update({ nome })
            .eq('id', currentMed.id);

        if (!error) {
            setMedicamentos(prev => prev.map(m => m.id === currentMed.id ? { ...m, nome } : m));
            showToast('success', 'Atualizado', 'Medicamento alterado com sucesso.');
            setIsModalOpen(false);
        } else {
            showToast('error', 'Erro', error.message);
        }
    } else {
        // CRIAÇÃO
        const { data, error } = await supabase
            .from('medicamentos')
            .insert({ nome })
            .select()
            .single();

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
    // Optimistic Delete: Remove da tela antes do banco responder
    const backup = [...medicamentos];
    setMedicamentos(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);

    const { error } = await supabase.from('medicamentos').delete().eq('id', id);

    if (error) {
        setMedicamentos(backup); // Reverte se der erro
        showToast('error', 'Erro ao excluir', 'O medicamento pode estar em uso em alguma prescrição.');
    } else {
        showToast('success', 'Excluído', 'Medicamento removido da base.');
    }
  };

  // Filtragem local
  const filtered = medicamentos.filter(m => 
    (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-orange-50 p-4 md:p-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                        <Pill /> Base de Medicamentos
                    </h1>
                    <p className="text-sm text-slate-500">Gerencie a lista para o autocomplete</p>
                </div>
            </div>
            <button onClick={() => abrirModal()} className="w-full md:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                <Plus size={20} /> Novo Medicamento
            </button>
        </div>

        {/* BUSCA */}
        <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400 h-5 w-5" />
            <input 
                type="text" 
                placeholder="Buscar medicamento..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 shadow-sm font-medium" 
            />
        </div>

        {/* CABEÇALHO DA LISTA (CONTADOR) */}
        <div className="flex items-center gap-2 px-2">
            <Package size={16} className="text-orange-500"/>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {filtered.length} Medicamentos Encontrados
            </span>
        </div>

        {/* LISTA DE MEDICAMENTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {filtered.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                    Nenhum medicamento encontrado.
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {filtered.map((med) => (
                        <div key={med.id} className="p-4 flex justify-between items-center hover:bg-orange-50/30 transition-colors group">
                            <div className="flex items-center gap-3">
                                {/* Ícone com a inicial do remédio */}
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-black text-lg shrink-0">
                                    {(med.nome?.[0] || '?').toUpperCase()}
                                </div>
                                
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 text-lg leading-tight">
                                        {med.nome}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {med.id}</span>
                                </div>
                            </div>
                            
                            {/* Botões de Ação */}
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirModal(med)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                    <Pencil size={18} />
                                </button>
                                <button onClick={() => setDeletingId(med.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* --- MODAIS ABAIXO (MANTIDOS IGUAIS AO ANTERIOR) --- */}

      {/* MODAL ADICIONAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{currentMed ? 'Editar Medicamento' : 'Novo Medicamento'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
                </div>
                <form onSubmit={handleSalvar}>
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Comercial / Genérico</label>
                        <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: Dipirona 500mg" autoFocus />
                    </div>
                    <button type="submit" disabled={saving} className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-70 transition-all flex justify-center items-center gap-2">
                        {saving ? <Loader2 className="animate-spin h-5 w-5"/> : <><Save size={18}/> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200 border-2 border-red-50">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="text-red-500 w-8 h-8" /></div>
                <h2 className="text-xl font-bold text-red-800 mb-2">Tem certeza?</h2>
                <p className="text-red-500 text-sm mb-6">Esta ação removerá o medicamento da lista de autocompletar.</p>
                <div className="flex gap-3">
                    <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button onClick={() => handleExcluir(deletingId)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all">Excluir</button>
                </div>
            </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className={`flex items-center gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[300px] ${toast.type === 'success' ? 'bg-white/95 border-green-100 text-green-800' : 'bg-white/95 border-red-100 text-red-800'}`}>
            <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{toast.title}</h4>
              <p className="text-xs font-medium opacity-80 leading-tight">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}