'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { 
  LogOut, Plus, Search, AlertCircle, Save, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Pill, Trash2, Lock, AlertTriangle, Shield,
  ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// --- Interfaces ---
interface Historico { data_hora: string; }
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
  // Estados
  const [encontristas, setEncontristas] = useState<Encontrista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Estado para o Modal de Confirmação de Check-in
  const [checkInConfirmation, setCheckInConfirmation] = useState<{ id: number, statusAtual: boolean, nome: string } | null>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [novasAlergias, setNovasAlergias] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // --- LÓGICA E CÁLCULOS ---
  const totalEncontristas = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalEncontristas - totalPresentes;

  const buscarEncontristas = useCallback(async () => {
    const { data, error } = await supabase
      .from('encontristas')
      .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
      .order('nome', { ascending: true });

    if (error) console.error(error);
    else setEncontristas((data as unknown as Encontrista[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').includes(user.email)) {
            setIsAdmin(true);
        }
        await buscarEncontristas();
    };
    init();
  }, [buscarEncontristas, supabase]);

  const getStatusPessoa = (pessoa: Encontrista) => {
    if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) return { cor: 'bg-slate-100 text-slate-500 border-slate-200', texto: 'Sem meds', prioridade: 0 };
    
    let statusGeral = 3;
    for (const med of pessoa.prescricoes) {
      const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
      if (!match) continue; 
      const intervaloHoras = parseInt(match[1]);
      const historico = med.historico_administracao?.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
      const ultimoRegistro = historico?.[0];
      let dataBase = ultimoRegistro ? new Date(ultimoRegistro.data_hora) : null;
      
      if (!dataBase) {
        const [hora, minuto] = med.horario_inicial.split(':').map(Number);
        const hoje = new Date();
        dataBase = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
      } else {
        dataBase = new Date(dataBase.getTime() + intervaloHoras * 60 * 60 * 1000);
      }

      const diffMinutos = (dataBase.getTime() - new Date().getTime()) / 1000 / 60;
      if (diffMinutos < 0) { statusGeral = 1; break; } 
      else if (diffMinutos < 30) { statusGeral = Math.min(statusGeral, 2); }
    }

    if (statusGeral === 1) return { cor: 'bg-red-100 text-red-700 border-red-200 animate-pulse', texto: 'Atrasado', prioridade: 3 };
    if (statusGeral === 2) return { cor: 'bg-amber-100 text-amber-700 border-amber-200', texto: 'Atenção', prioridade: 2 };
    return { cor: 'bg-emerald-100 text-emerald-700 border-emerald-200', texto: 'Em dia', prioridade: 1 };
  };

  const solicitarCheckIn = (id: number, currentStatus: boolean, nome: string) => {
    setCheckInConfirmation({ id, statusAtual: currentStatus, nome });
  };

  const confirmarCheckIn = async () => {
    if (!checkInConfirmation) return;

    const { id, statusAtual } = checkInConfirmation;
    const novoStatus = !statusAtual;

    setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: novoStatus } : p));
    setCheckInConfirmation(null);

    const { error } = await supabase.from('encontristas').update({ check_in: novoStatus }).eq('id', id);

    if (error) {
        alert("Erro ao atualizar. Recarregando...");
        buscarEncontristas();
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return alert("Nome obrigatório!");
    setSaving(true);
    const { error } = await supabase.from('encontristas').insert({ nome: novoNome, responsavel: novoResponsavel, alergias: novasAlergias, observacoes: novasObservacoes, check_in: false });
    if (!error) {
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes(''); setIsModalOpen(false); buscarEncontristas();
    } else alert(error.message);
    setSaving(false);
  };

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== '123') { alert("Senha incorreta!"); setResetPassword(''); return; }
    setIsResetting(true);
    const { error } = await supabase.from('encontristas').delete().gt('id', 0);
    if (!error) { setEncontristas([]); setIsResetModalOpen(false); setResetPassword(''); }
    setIsResetting(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !confirm("Importar lista?")) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const lines = (e.target?.result as string).split('\n');
        let count = 0;
        for (const line of lines) {
            const parts = line.trim().split(','); 
            if (parts.length >= 2 && !line.startsWith('#')) {
                const { error } = await supabase.from('encontristas').insert({ 
                    nome: parts[1]?.trim(), 
                    alergias: parts[2]?.replace(/['"]+/g, '').trim(), 
                    observacoes: parts[3]?.trim() || null, 
                    responsavel: parts[4]?.trim() || null, 
                    check_in: false 
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

  const filtered = encontristas.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    return p.nome.toLowerCase().includes(term) || p.responsavel?.toLowerCase().includes(term) || (term && p.id === Number(term));
  });

  const sorted = [...filtered].sort((a, b) => getStatusPessoa(b).prioridade - getStatusPessoa(a).prioridade);

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Image src="/favicon.ico" alt="Logo" width={32} height={32} className="w-8 h-8 rounded-lg shadow-sm" />
             <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               Face a Face <span className="hidden sm:inline-block text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Painel</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && <Link href="/dashboard/equipe" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="Equipe"><Shield size={20}/></Link>}
            <Link href="/dashboard/medicamentos" className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors font-medium flex items-center gap-2"><Pill size={20}/><span className="hidden sm:inline">Meds</span></Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* VISÃO GERAL */}
        <div className="md:hidden">
          <button onClick={() => setShowStats(!showStats)} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between active:scale-[0.99] transition-transform">
            <div>
              <span className="text-slate-800 font-bold text-lg block">Visão Geral</span>
              <span className="text-sm text-slate-500">{totalPresentes} de {totalEncontristas} presentes</span>
            </div>
            <div className={`transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`}><ChevronDown className="text-slate-400"/></div>
          </button>
        </div>

        {/* CARDS ESTATÍSTICAS */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 ${showStats ? 'block' : 'hidden md:grid'}`}>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between card-hover">
                <div><p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Inscritos</p><p className="text-3xl font-bold text-slate-800">{totalEncontristas}</p></div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between card-hover">
                <div><p className="text-xs uppercase tracking-wide text-green-600 font-semibold">Presentes</p><p className="text-3xl font-bold text-green-700">{totalPresentes}</p></div>
                <div className="bg-green-50 p-3 rounded-xl text-green-600"><UserCheck size={24} /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between card-hover">
                <div><p className="text-xs uppercase tracking-wide text-red-500 font-semibold">Ausentes</p><p className="text-3xl font-bold text-red-700">{totalAusentes}</p></div>
                <div className="bg-red-50 p-3 rounded-xl text-red-500"><UserX size={24} /></div>
            </div>
        </div>

        {/* BARRA DE AÇÕES */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400 h-5 w-5" />
            <input type="text" placeholder="Buscar por nome ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 shadow-sm" />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {isAdmin && (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm whitespace-nowrap transition-colors">
                        {importing ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18} />} <span className="hidden lg:inline">Importar</span>
                    </button>
                    <button onClick={() => setIsResetModalOpen(true)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-sm whitespace-nowrap transition-colors">
                        <Trash2 size={18} /> <span className="hidden lg:inline">Zerar</span>
                    </button>
                </>
            )}
            <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-orange-200 active:scale-95 transition-all whitespace-nowrap">
                <Plus size={20} /> Novo
            </button>
          </div>
        </div>

        {/* LISTA DE ENCONTRISTAS */}
        <div className="md:hidden space-y-3">
          {loading ? <div className="text-center py-8 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>Carregando...</div> : sorted.length === 0 ? <div className="text-center py-8 text-slate-400">Ninguém encontrado.</div> : sorted.map((pessoa) => {
             const status = getStatusPessoa(pessoa);
             return (
              <div key={pessoa.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start mb-3">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs font-mono text-slate-400">#{pessoa.id}</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${status.cor}`}>{status.texto}</span>
                      </div>
                      <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-lg font-bold text-slate-800 hover:text-orange-600">{pessoa.nome}</Link>
                      {pessoa.responsavel && <p className="text-sm text-slate-500">Resp: {pessoa.responsavel}</p>}
                   </div>
                   <button onClick={() => solicitarCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`p-2 rounded-full transition-colors ${pessoa.check_in ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {pessoa.check_in ? <UserCheck size={20}/> : <UserX size={20}/>}
                   </button>
                </div>
                {pessoa.alergias && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0"/>
                        <span className="text-xs text-red-700 font-medium leading-tight">{pessoa.alergias}</span>
                    </div>
                )}
              </div>
             )
          })}
        </div>

        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">ID</th>
                  <th className="p-4 font-semibold">Nome</th>
                  <th className="p-4 font-semibold text-center">Check-in</th>
                  <th className="p-4 font-semibold">Responsável</th>
                  <th className="p-4 font-semibold">Alergias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={6} className="p-10 text-center text-slate-400">Carregando lista...</td></tr> : sorted.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum resultado encontrado.</td></tr> : sorted.map((pessoa) => {
                    const status = getStatusPessoa(pessoa);
                    return (
                    <tr key={pessoa.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.cor}`}><Clock size={12}/> {status.texto}</span></td>
                      <td className="p-4 text-sm text-slate-400 font-mono">#{pessoa.id}</td>
                      <td className="p-4 font-medium text-slate-800"><Link href={`/dashboard/encontrista/${pessoa.id}`} className="hover:text-orange-600 hover:underline decoration-orange-300 underline-offset-2">{pessoa.nome}</Link></td>
                      <td className="p-4 text-center">
                        <button onClick={() => solicitarCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm active:scale-95 transition-all ${pessoa.check_in ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                            {pessoa.check_in ? <UserCheck size={14} /> : <UserX size={14} />} {pessoa.check_in ? 'Presente' : 'Ausente'}
                        </button>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">{pessoa.responsavel || '-'}</td>
                      <td className="p-4">{pessoa.alergias ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-100"><AlertCircle size={12} /> {pessoa.alergias}</span> : <span className="text-slate-300 text-xs">-</span>}</td>
                    </tr>
                  )})
                }
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* MODAL CONFIRMAÇÃO CHECK-IN */}
      {checkInConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${!checkInConfirmation.statusAtual ? 'bg-green-100' : 'bg-red-50'}`}>
                    {!checkInConfirmation.statusAtual ? <UserCheck className="text-green-600 w-8 h-8"/> : <UserX className="text-red-500 w-8 h-8"/>}
                </div>
                
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {!checkInConfirmation.statusAtual ? "Confirmar Presença?" : "Cancelar Presença?"}
                </h2>
                
                <p className="text-slate-500 mb-6">
                    {!checkInConfirmation.statusAtual 
                        ? `Marcar ${checkInConfirmation.nome} como presente?`
                        : `Remover a presença de ${checkInConfirmation.nome}?`
                    }
                </p>
                
                <div className="flex gap-3">
                    <button onClick={() => setCheckInConfirmation(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                        Não
                    </button>
                    <button onClick={confirmarCheckIn} className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${!checkInConfirmation.statusAtual ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                        Sim
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Novo Encontrista */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
               <h2 className="text-slate-800 font-bold text-lg">Novo Encontrista</h2>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
             </div>
             <form onSubmit={handleSalvar} className="p-6 space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800" placeholder="Ex: João da Silva" autoFocus /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="Ex: Pr. Mario" /></div>
                    <div><label className="block text-xs font-bold text-red-500 uppercase mb-1">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-4 py-2.5 border border-red-100 bg-red-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-red-800 placeholder-red-300" placeholder="Opcional" /></div>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800" placeholder="..." /></div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-70 flex items-center gap-2 transition-all">
                        {saving ? <Loader2 className="animate-spin h-4 w-4"/> : <><Save size={18}/> Salvar</>}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Zerar Sistema */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-100 text-center animate-in fade-in zoom-in duration-200">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500 w-8 h-8" />
             </div>
             <h2 className="text-slate-800 font-bold text-xl mb-2">Zerar Sistema?</h2>
             <p className="text-slate-500 text-sm mb-6">Essa ação é irreversível. Todos os encontristas e históricos serão apagados.</p>
             
             <form onSubmit={handleZerarSistema} className="space-y-4">
                <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
                    <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-center text-slate-800 font-bold tracking-widest" placeholder="Senha..." autoFocus />
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button type="submit" disabled={isResetting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all">
                        {isResetting ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'CONFIRMAR'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}