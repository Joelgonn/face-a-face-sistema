'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, Upload, Search, Trash2, Plus, Loader2, Save, ChevronDown, Stethoscope, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Medicamento {
  id: number;
  nome: string;
  dosagem: string | null;
  posologia: string | null;
  indicacao: string | null;
  cuidado: string | null;
}

export default function GestaoMedicamentos() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estado para controlar qual card está expandido
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medToDelete, setMedToDelete] = useState<number | null>(null); // Novo estado para exclusão

  const [novoNome, setNovoNome] = useState('');
  const [novaDosagem, setNovaDosagem] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Busca dados
  const buscarMedicamentos = useCallback(async () => {
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .order('nome', { ascending: true });
    
    if (!error) setMedicamentos(data || []);
    setLoading(false);
  }, [supabase]);

  // =========================================================================
  // --- INÍCIO DA REFATORAÇÃO: VERIFICAÇÃO DE ADMIN NO BANCO DE DADOS ---
  // =========================================================================
  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
            // Consulta a tabela 'admins' em vez da variável de ambiente
            const { data: adminData } = await supabase
                .from('admins')
                .select('email')
                .eq('email', user.email)
                .single();

            if (adminData) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        }
        buscarMedicamentos();
    };
    init();
  }, [buscarMedicamentos, supabase]);
  // =========================================================================
  // --- FIM DA REFATORAÇÃO ---
  // =========================================================================

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return; 
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm("Deseja importar a lista de medicamentos?")) return; // Mantive aqui pois é ação de admin massiva, mas pode ser modal também se preferir

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        let count = 0;
        
        const cleanAndTrim = (s: string | undefined) => {
            if (!s) return null;
            let cleaned = s.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
            if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
            return cleaned.replace(/""/g, '"').trim();
        };

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;
            let parts = cleanLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
            if (parts.length < 2) parts = cleanLine.split(';'); 

            const cleanParts = parts.map(s => cleanAndTrim(s));

            if (cleanParts.length >= 2) { 
                const nome = cleanParts[0];
                const dosagem = cleanParts[1];
                const posologia = cleanParts[2] || null; 
                const indicacao = cleanParts[3] || null; 

                if (nome && dosagem) {
                    const { error } = await supabase.from('medicamentos').insert({ nome, dosagem, indicacao, posologia });
                    if (!error) count++;
                }
            }
        }
        alert(`${count} medicamentos importados!`);
        setImporting(false);
        buscarMedicamentos();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8'); 
  };

  // 1. Solicitar Exclusão (Abre Modal)
  const requestDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita expandir o card
    if (!isAdmin) { return; }
    setMedToDelete(id);
  };

  // 2. Confirmar Exclusão (Executa no Banco)
  const confirmDelete = async () => {
    if (medToDelete === null) return;
    
    await supabase.from('medicamentos').delete().eq('id', medToDelete);
    setMedToDelete(null); // Fecha modal
    buscarMedicamentos();
  };

  const handleSalvarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('medicamentos').insert({ nome: novoNome, dosagem: novaDosagem });
    setNovoNome(''); setNovaDosagem(''); setIsModalOpen(false);
    buscarMedicamentos();
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredMeds = medicamentos.filter(m => m.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-orange-50 relative pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-orange-200 shadow-sm px-4 py-4">
         <div className="max-w-5xl mx-auto flex items-center gap-4">
             <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                 <ArrowLeft size={20} />
             </Link>
             <div>
                <h1 className="text-lg font-bold text-orange-600">Base de Medicamentos</h1>
                <p className="text-xs text-orange-600 hidden sm:block">Gerencie o catálogo de remédios</p>
             </div>
         </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* BARRA DE AÇÕES */}
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-slate-400 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Buscar medicamento..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 shadow-sm" 
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                
                {isAdmin && (
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={importing}
                        className="bg-white text-orange-600 border border-red-200 hover:bg-orange-50 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-colors"
                        title="Importar"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv" />
                        {importing ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18} />} 
                        <span className="hidden lg:inline">Importar TXT</span>
                    </button>
                )}

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-orange-200 active:scale-95 transition-all whitespace-nowrap"
                    title="Novo Medicamento"
                >
                    <Plus size={20} /> 
                    <span className="hidden md:inline">Novo</span>
                </button>
            </div>
        </div>

        {/* LISTA DE CARDS (GRID RESPONSIVO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
                 <div className="col-span-full text-center py-10 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>Carregando...</div>
            ) : filteredMeds.length === 0 ? (
                 <div className="col-span-full text-center py-10 bg-white rounded-3xl border border-slate-100 border-dashed text-slate-400">Nenhum medicamento encontrado.</div>
            ) : (
                filteredMeds.map(med => {
                    const isExpanded = expandedId === med.id;
                    return (
                        <div 
                            key={med.id} 
                            onClick={() => toggleExpand(med.id)}
                            className={`bg-white rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'border-orange-300 shadow-md ring-1 ring-orange-100' : 'border-slate-100 shadow-sm hover:border-orange-200'}`}
                        >
                            {/* CABEÇALHO DO CARD */}
                            <div className="p-4 flex justify-between items-start gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-600 text-lg leading-tight">{med.nome}</h3>
                                    <span className="inline-block mt-1 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                        {med.dosagem || 'S/D'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => requestDelete(med.id, e)} 
                                            className="p-2 text-orange-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown size={18} className="text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            {/* CONTEÚDO EXPANSÍVEL (DETALHES) */}
                            <div className={`bg-slate-50 border-t border-slate-100 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-4 space-y-3">
                                    {med.indicacao && (
                                        <div className="text-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                                                <Stethoscope size={12} /> Indicação
                                            </p>
                                            <p className="text-slate-700 leading-snug">{med.indicacao}</p>
                                        </div>
                                    )}
                                    {med.posologia && (
                                        <div className="text-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                                                <Clock size={12} /> Posologia Padrão
                                            </p>
                                            <p className="text-slate-700 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200 inline-block">{med.posologia}</p>
                                        </div>
                                    )}
                                    {!med.indicacao && !med.posologia && (
                                        <p className="text-xs text-slate-400 italic text-center">Sem informações adicionais.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

      </main>

      {/* MODAL ADICIONAR MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-6 text-orange-600">Novo Medicamento</h2>
                <form onSubmit={handleSalvarManual} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                        <input autoFocus className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: Dipirona" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosagem</label>
                        <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: 500mg" value={novaDosagem} onChange={e => setNovaDosagem(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex justify-center items-center gap-2">
                            <Save size={18}/> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO (ESTILIZADO) */}
      {medToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border-2 border-red-100 text-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <AlertTriangle className="text-red-500 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Medicamento?</h2>
                <p className="text-red-500 text-sm mb-6">
                    Tem certeza que deseja remover este item da base de dados? Essa ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setMedToDelete(null)} 
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                    >
                        Sim, Excluir
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}