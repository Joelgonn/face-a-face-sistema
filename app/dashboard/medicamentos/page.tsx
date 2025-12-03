'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, Upload, Search, Trash2, Plus, Pill, Loader2, Save, Lock } from 'lucide-react';
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
  const [isAdmin, setIsAdmin] = useState(false); // Estado de Admin
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaDosagem, setNovaDosagem] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Função de busca
  const buscarMedicamentos = useCallback(async () => {
    const { data, error } = await supabase
      .from('medicamentos')
      .select('*')
      .order('nome', { ascending: true });
    
    if (!error) setMedicamentos(data || []);
    setLoading(false);
  }, [supabase]);

  // Verifica Admin e carrega dados
  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        // Verifica se o e-mail é o do admin definido no .env
        if (user && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
        buscarMedicamentos();
    };
    init();
  }, [buscarMedicamentos, supabase]);

  // Função de Importar (Só funciona se for Admin)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return; // Trava de segurança lógica

    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm("Deseja importar a lista de medicamentos?")) return;

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

  // Função de Deletar (Só funciona se for Admin)
  const handleDelete = async (id: number) => {
    if (!isAdmin) { alert("Apenas administradores podem excluir."); return; }
    if (!confirm("Excluir este medicamento da base?")) return;
    
    await supabase.from('medicamentos').delete().eq('id', id);
    buscarMedicamentos();
  };

  // Função de Salvar Manual
  const handleSalvarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('medicamentos').insert({ nome: novoNome, dosagem: novaDosagem });
    setNovoNome(''); setNovaDosagem(''); setIsModalOpen(false);
    buscarMedicamentos();
  };

  // Filtro de busca
  const filteredMeds = medicamentos.filter(m => m.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
             <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-orange-600 font-medium transition-colors">
                <ArrowLeft className="mr-2 h-5 w-5" /> Voltar ao Painel
             </Link>
             <h1 className="text-2xl font-bold text-orange-800 flex items-center gap-2">
                <Pill /> Base de Medicamentos
             </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                <input type="text" placeholder="Buscar medicamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm text-gray-900" />
            </div>
            <div className="flex gap-2">
                
                {/* Botão Importar: Só Admin */}
                {isAdmin && (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                            {importing ? <Loader2 className="animate-spin"/> : <Upload size={20} />} Importar TXT
                        </button>
                    </>
                )}

                <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all active:scale-95">
                    <Plus size={20} /> Novo
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-orange-50/50 text-orange-800 text-sm uppercase">
                        <tr><th className="p-4">Nome</th><th className="p-4">Dosagem</th><th className="p-4">Indicação/Posologia</th><th className="p-4 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando...</td></tr> : filteredMeds.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nenhum medicamento encontrado.</td></tr> : (
                            filteredMeds.map(med => (
                                <tr key={med.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">{med.nome}</td>
                                    <td className="p-4 text-gray-600">{med.dosagem || '-'}</td>
                                    <td className="p-4 text-gray-500 text-sm truncate max-w-xs" title={med.indicacao || med.posologia || ''}>{med.indicacao || med.posologia || '-'}</td>
                                    <td className="p-4 text-center">
                                        {isAdmin ? (
                                            <button onClick={() => handleDelete(med.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2" title="Excluir">
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <Lock size={16} className="text-gray-300 mx-auto" />
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Modal Novo Medicamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h2 className="text-lg font-bold mb-4 text-gray-800">Adicionar Medicamento</h2>
                <form onSubmit={handleSalvarManual} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input autoFocus className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-900" placeholder="Ex: Dipirona" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Dosagem</label><input className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-900" placeholder="Ex: 500mg" value={novaDosagem} onChange={e => setNovaDosagem(e.target.value)} /></div>
                    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button><button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"><Save size={16}/> Salvar</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}