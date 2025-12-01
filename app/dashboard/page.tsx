'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Plus, Search, UserCheck, UserX, AlertCircle, Save, Loader2, Upload, LogOut, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Encontrista {
  id: number;
  nome: string;
  alergias: string | null;
  responsavel: string | null;
  check_in: boolean;
  observacoes: string | null;
}

export default function Dashboard() {
  const [encontristas, setEncontristas] = useState<Encontrista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [novasAlergias, setNovasAlergias] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Função memorizada com useCallback para o useEffect aceitar
  const buscarEncontristas = useCallback(async () => {
    const { data, error } = await supabase
      .from('encontristas')
      .select('*')
      .order('nome', { ascending: true });

    if (error) console.error('Erro ao buscar:', error);
    else setEncontristas(data || []);
    setLoading(false);
  }, [supabase]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return alert("O nome é obrigatório!");
    setSaving(true);

    const { error } = await supabase.from('encontristas').insert({
        nome: novoNome,
        responsavel: novoResponsavel,
        alergias: novasAlergias,
        observacoes: novasObservacoes,
        check_in: false
    });

    if (error) alert("Erro: " + error.message);
    else {
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes('');
      setIsModalOpen(false);
      buscarEncontristas();
    }
    setSaving(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("Isso irá importar os encontristas do arquivo. Deseja continuar?")) {
        event.target.value = '';
        return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        let count = 0;

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine.startsWith('#')) continue;

            const parts = cleanLine.split(','); 
            
            if (parts.length >= 2) {
                const nome = parts[1]?.trim();
                const alergiasRaw = parts[2]?.replace(/['"]+/g, '').trim(); 
                const alergias = alergiasRaw ? alergiasRaw.split(';').map(s => s.trim()).join(', ') : null;
                const observacoes = parts[3]?.trim() || null;
                const responsavel = parts[4]?.trim() || null;

                const { error } = await supabase.from('encontristas').insert({
                    nome,
                    alergias,
                    observacoes,
                    responsavel,
                    check_in: false
                });

                if (!error) count++;
            }
        }
        
        alert(`${count} encontristas importados com sucesso!`);
        setImporting(false);
        buscarEncontristas();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => { 
    buscarEncontristas(); 
  }, [buscarEncontristas]);

  const filteredEncontristas = encontristas.filter(pessoa => 
    pessoa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pessoa.responsavel && pessoa.responsavel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-orange-50 relative">
      <header className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-700 flex items-center gap-2">Face a Face <span className="text-sm font-normal text-gray-500 bg-orange-100 px-2 py-1 rounded-full">Painel</span></h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm font-medium"><LogOut size={18} /> Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm" />
          </div>
          
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv" />
            
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                {importing ? <Loader2 size={20} className="animate-spin"/> : <Upload size={20} />} Importar
            </button>

            <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all active:scale-95">
                <Plus size={20} /> Novo
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-orange-100/50 text-orange-800 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold">Responsável</th>
                  <th className="p-4 font-semibold">Alergias</th>
                  <th className="p-4 font-semibold text-center">Check-in</th>
                  <th className="p-4 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (<tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>) : filteredEncontristas.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum resultado encontrado.</td></tr>) : (
                  filteredEncontristas.map((pessoa) => (
                    <tr key={pessoa.id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="p-4 font-medium text-gray-900">{pessoa.nome}</td>
                      <td className="p-4 text-gray-600">{pessoa.responsavel || '-'}</td>
                      <td className="p-4">
                        {pessoa.alergias ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertCircle size={12} /> {pessoa.alergias}</span> : <span className="text-gray-400 text-sm">-</span>}
                      </td>
                      <td className="p-4 text-center">
                        {pessoa.check_in ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><UserCheck size={12} /> Feito</span> : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"><UserX size={12} /> Pendente</span>}
                      </td>
                      <td className="p-4 text-center">
                        <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-orange-600 hover:text-orange-800 font-medium text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Detalhes</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 text-right text-sm text-gray-500">Total: {filteredEncontristas.length}</div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-orange-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">Novo Encontrista</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white"><X size={24}/></button>
            </div>
            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: João da Silva" autoFocus /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Pr. Mario" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-3 py-2 border border-red-200 bg-red-50 rounded-lg" placeholder="Ex: Dipirona" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg">{saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}