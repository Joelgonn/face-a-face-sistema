'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { 
  LogOut, Plus, Search, AlertCircle, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Pill, Trash2, AlertTriangle, Shield 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Interfaces ---
interface Historico {
  data_hora: string;
}

interface Prescricao {
  id: number;
  posologia: string;
  horario_inicial: string;
  historico_administracao: Historico[];
}

interface Encontrista {
  id: number;
  nome: string;
  alergias: string | null;
  responsavel: string | null;
  check_in: boolean;
  observacoes: string | null;
  prescricoes: Prescricao[];
}

export default function Dashboard() {
  // Estados de Dados e Usuário
  const [encontristas, setEncontristas] = useState<Encontrista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Estados do Modal Novo Encontrista
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [novasAlergias, setNovasAlergias] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');

  // Estados do Modal Zerar Sistema
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // --- LÓGICA ---

  const buscarEncontristas = useCallback(async () => {
    const { data, error } = await supabase
      .from('encontristas')
      .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
      .order('nome', { ascending: true });

    if (error) {
        console.error('Erro:', error);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEncontristas((data as any) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const checkUserAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            setIsAdmin(true);
        }
        await buscarEncontristas();
    };

    checkUserAndFetch();
  }, [buscarEncontristas, supabase]);

  const totalEncontristas = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalEncontristas - totalPresentes;

  const getStatusPessoa = (pessoa: Encontrista) => {
    if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) {
      return { cor: 'bg-gray-100 text-gray-400', texto: 'Sem meds', prioridade: 0 };
    }

    let statusGeral = 3; 

    for (const med of pessoa.prescricoes) {
      const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
      if (!match) continue; 

      const intervaloHoras = parseInt(match[1]);
      
      const historico = med.historico_administracao?.sort((a, b) => 
        new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
      );
      
      const ultimoRegistro = historico?.[0];
      let dataBase = ultimoRegistro ? new Date(ultimoRegistro.data_hora) : null;
      
      if (!dataBase) {
        const [hora, minuto] = med.horario_inicial.split(':').map(Number);
        const hoje = new Date();
        dataBase = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
      } else {
        dataBase = new Date(dataBase.getTime() + intervaloHoras * 60 * 60 * 1000);
      }

      const agora = new Date();
      const diffMinutos = (dataBase.getTime() - agora.getTime()) / 1000 / 60;

      if (diffMinutos < 0) {
        statusGeral = 1; 
        break; 
      } else if (diffMinutos < 30) {
        statusGeral = Math.min(statusGeral, 2); 
      }
    }

    if (statusGeral === 1) return { cor: 'bg-red-100 text-red-700 border-red-200 animate-pulse', texto: 'Atrasado', prioridade: 3 };
    if (statusGeral === 2) return { cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', texto: 'Atenção', prioridade: 2 };
    return { cor: 'bg-green-100 text-green-700 border-green-200', texto: 'Em dia', prioridade: 1 };
  };

  const toggleCheckIn = async (id: number, currentStatus: boolean, nome: string) => {
    const acao = currentStatus ? "CANCELAR a presença" : "CONFIRMAR a presença";
    if (!confirm(`Tem certeza que deseja ${acao} de ${nome}?`)) return;

    setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: !currentStatus } : p));

    const { error } = await supabase
        .from('encontristas')
        .update({ check_in: !currentStatus })
        .eq('id', id);

    if (error) {
        alert("Erro ao atualizar check-in");
        buscarEncontristas();
    }
  };

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

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (resetPassword !== '123') {
        alert("Senha incorreta! Ação cancelada.");
        setResetPassword('');
        return;
    }

    setIsResetting(true);
    const { error } = await supabase.from('encontristas').delete().gt('id', 0);

    if (error) {
        alert("Erro ao limpar o sistema: " + error.message);
    } else {
        alert("Sistema limpo com sucesso!");
        setEncontristas([]);
        setIsResetModalOpen(false);
        setResetPassword('');
    }
    setIsResetting(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm("Importar encontristas?")) { event.target.value = ''; return; }
    
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
                    nome, alergias, observacoes, responsavel, check_in: false 
                });
                if (!error) count++;
            }
        }
        alert(`${count} importados!`);
        setImporting(false);
        buscarEncontristas();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      router.push('/'); 
      router.refresh();
  };

  const filteredEncontristas = encontristas.filter(pessoa => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const searchId = Number(term);
    if (!isNaN(searchId) && term !== '') {
        return pessoa.id === searchId;
    }
    return (
      pessoa.nome.toLowerCase().includes(term) ||
      (pessoa.responsavel && pessoa.responsavel.toLowerCase().includes(term))
    );
  });

  const sortedEncontristas = [...filteredEncontristas].sort((a, b) => {
     const statusA = getStatusPessoa(a);
     const statusB = getStatusPessoa(b);
     return statusB.prioridade - statusA.prioridade;
  });

  return (
    <div className="min-h-screen bg-orange-50 relative">
      
      <header className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-700 flex items-center gap-2">
            Face a Face <span className="text-sm font-normal text-gray-500 bg-orange-100 px-2 py-1 rounded-full">Painel</span>
          </h1>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
                <Link 
                    href="/dashboard/equipe" 
                    className="hidden md:flex items-center gap-2 text-gray-600 hover:text-orange-700 text-sm font-medium bg-white px-3 py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-orange-200 hover:bg-orange-50"
                >
                    <Shield size={18} /> Equipe
                </Link>
            )}
            <Link href="/dashboard/medicamentos" className="hidden md:flex items-center gap-2 text-orange-700 hover:text-orange-900 text-sm font-medium bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-200 hover:bg-orange-100">
                <Pill size={18} /> Medicamentos
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
                <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
                <div><p className="text-sm text-gray-500 font-medium">Total Inscritos</p><p className="text-2xl font-bold text-gray-800">{totalEncontristas}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Users size={24} /></div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 flex items-center justify-between">
                <div><p className="text-sm text-green-600 font-medium">Já Chegaram</p><p className="text-2xl font-bold text-green-700">{totalPresentes}</p></div>
                <div className="bg-green-50 p-3 rounded-lg text-green-600"><UserCheck size={24} /></div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-center justify-between">
                <div><p className="text-sm text-red-500 font-medium">Faltam Chegar</p><p className="text-2xl font-bold text-red-700">{totalAusentes}</p></div>
                <div className="bg-red-50 p-3 rounded-lg text-red-500"><UserX size={24} /></div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
            <input 
                type="text" 
                placeholder="Nome, Responsável ou ID..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm text-gray-900" 
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                        {importing ? <Loader2 size={20} className="animate-spin"/> : <Upload size={20} />} Importar
                    </button>
                    <button onClick={() => setIsResetModalOpen(true)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
                        <Trash2 size={20} /> Zerar
                    </button>
                </>
            )}
            <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md active:scale-95 transition-all">
                <Plus size={20} /> Novo
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-orange-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-orange-100/50 text-orange-800 text-sm uppercase">
                  <th className="p-4">Status</th><th className="p-4">ID</th><th className="p-4">Nome</th><th className="p-4 text-center">Check-in</th><th className="p-4">Responsável</th><th className="p-4">Alergias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                ) : sortedEncontristas.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum resultado encontrado.</td></tr>
                ) : (
                  sortedEncontristas.map((pessoa) => {
                    const status = getStatusPessoa(pessoa);
                    return (
                    <tr key={pessoa.id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="p-4"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.cor}`}><Clock size={12}/> {status.texto}</span></td>
                      <td className="p-4 text-sm text-gray-500">#{pessoa.id}</td>
                      <td className="p-4 font-medium text-gray-900"><Link href={`/dashboard/encontrista/${pessoa.id}`} className="hover:text-orange-600 hover:underline">{pessoa.nome}</Link></td>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm active:scale-95 ${pessoa.check_in ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {pessoa.check_in ? <UserCheck size={14} /> : <UserX size={14} />} {pessoa.check_in ? 'Presente' : 'Ausente'}
                        </button>
                      </td>
                      <td className="p-4 text-gray-600">{pessoa.responsavel || '-'}</td>
                      <td className="p-4">{pessoa.alergias ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertCircle size={12} /> {pessoa.alergias}</span> : <span className="text-gray-300 text-sm">-</span>}</td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
             <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Novo Encontrista</h2><button onClick={() => setIsModalOpen(false)}><X size={24}/></button></div>
             <form onSubmit={handleSalvar} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:outline-none" autoFocus /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-3 py-2 border border-red-200 bg-red-50 rounded-lg text-gray-900" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" /></div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold">{saving ? '...' : 'Salvar'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-100 text-center">
             <AlertTriangle className="text-red-600 w-12 h-12 mx-auto mb-2" />
             <h2 className="text-red-900 font-bold text-xl">Zerar Sistema</h2>
             <p className="text-red-700 text-sm mb-4">Cuidado! Isso apagará TODOS os encontristas.</p>
             <form onSubmit={handleZerarSistema} className="space-y-4">
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-center text-gray-900" placeholder="Senha..." autoFocus />
                <div className="flex gap-2">
                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700">Cancelar</button>
                    <button type="submit" disabled={isResetting} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">{isResetting ? '...' : 'Confirmar'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}