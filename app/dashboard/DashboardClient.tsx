'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { zerarSistemaCompleto } from '@/app/actions/system';
import { Database } from '@/types/supabase'; 
import { 
  LogOut, Plus, Search, AlertCircle, Save, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Pill, Trash2, AlertTriangle, Shield,
  FileText, CheckCircle2, FileSpreadsheet, Activity, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Papa from 'papaparse'; 

// --- TIPAGEM AVANÇADA ---
type EncontristaRow = Database['public']['Tables']['encontristas']['Row'];
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row'];
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row'];

export type EncontristaDashboard = EncontristaRow & {
  prescricoes: (Pick<PrescricaoRow, 'id' | 'posologia' | 'horario_inicial'> & {
    historico_administracao: Pick<HistoricoRow, 'data_hora'>[]
  })[]
};

interface ToastNotification {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

interface DashboardClientProps {
  initialEncontristas: EncontristaDashboard[];
  isAdminInitial: boolean;
}

export default function DashboardClient({ 
  initialEncontristas, 
  isAdminInitial 
}: DashboardClientProps) {
  
  const [encontristas, setEncontristas] = useState<EncontristaDashboard[]>(initialEncontristas);
  const [isAdmin] = useState(isAdminInitial);
  const [loading, setLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(false); // NOVO: Controle das estatísticas
  const [toast, setToast] = useState<ToastNotification | null>(null);
  
  const [importing, setImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [novasAlergias, setNovasAlergias] = useState('');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [checkInTarget, setCheckInTarget] = useState<{id: number, status: boolean, nome: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000); 
  };

  const totalEncontristas = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalEncontristas - totalPresentes;

  const buscarEncontristas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('encontristas')
      .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
      .order('nome', { ascending: true });

    if (error) {
        console.error(error);
    } else {
        setEncontristas((data as unknown) as EncontristaDashboard[] || []);
    }
    setLoading(false);
  }, [supabase]);

  const getStatusPessoa = (pessoa: EncontristaDashboard) => {
    if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) {
      return { 
        cor: 'bg-slate-50 text-slate-500 border-slate-200', 
        bordaL: 'border-l-slate-300',
        texto: 'Sem Meds', prioridade: 0, icone: <Activity size={12}/> 
      };
    }
    
    let statusGeral = 3; 
    
    for (const med of pessoa.prescricoes) {
      if (!med.posologia || !med.horario_inicial) continue;

      const match = med.posologia.match(/(\d+)\s*(?:h|hora)/i);
      if (!match) continue; 
      
      const intervaloHoras = parseInt(match[1]);
      const historico = med.historico_administracao?.sort((a, b) => 
        new Date(b.data_hora as string).getTime() - new Date(a.data_hora as string).getTime()
      );
      const ultimoRegistro = historico?.[0];
      
      const dataBase = ultimoRegistro?.data_hora 
        ? new Date(new Date(ultimoRegistro.data_hora as string).getTime() + intervaloHoras * 60 * 60 * 1000)
        : (() => {
            const [hora, minuto] = med.horario_inicial.split(':').map(Number);
            const hoje = new Date();
            return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hora, minuto);
          })();

      const diffMinutos = (dataBase.getTime() - new Date().getTime()) / 1000 / 60;
      
      if (diffMinutos < 0) { statusGeral = 1; break; } 
      else if (diffMinutos < 30) { statusGeral = Math.min(statusGeral, 2); } 
    }

    if (statusGeral === 1) return { cor: 'bg-rose-50 text-rose-700 border-rose-100', bordaL: 'border-l-rose-500', texto: 'Atrasado', prioridade: 3, icone: <AlertTriangle size={12}/> };
    if (statusGeral === 2) return { cor: 'bg-amber-50 text-amber-700 border-amber-100', bordaL: 'border-l-amber-500', texto: 'Atenção', prioridade: 2, icone: <Clock size={12}/> };
    return { cor: 'bg-emerald-50 text-emerald-700 border-emerald-100', bordaL: 'border-l-emerald-500', texto: 'Em Dia', prioridade: 1, icone: <CheckCircle2 size={12}/> };
  };

  const requestCheckIn = (id: number, currentStatus: boolean | null, nome: string) => {
    setCheckInTarget({ id, status: currentStatus || false, nome });
  };

  const confirmCheckIn = async () => {
    if (!checkInTarget) return;
    const { id, status } = checkInTarget;
    setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: !status } : p));
    setCheckInTarget(null);
    await supabase.from('encontristas').update({ check_in: !status }).eq('id', id);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
        showToast('warning', 'Atenção', 'O nome do encontrista é obrigatório.');
        return;
    }
    setSaving(true);
    
    const { error } = await supabase.from('encontristas').insert({ 
      nome: novoNome, 
      responsavel: novoResponsavel, 
      alergias: novasAlergias, 
      observacoes: novasObservacoes, 
      check_in: false 
    });

    if (!error) {
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes(''); 
      setIsModalOpen(false); 
      showToast('success', 'Cadastrado!', `${novoNome} adicionado.`);
      buscarEncontristas();
    } else {
      showToast('error', 'Erro', error.message);
    }
    setSaving(false);
  };

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setIsResetting(true);
    const resultado = await zerarSistemaCompleto(resetPassword);
    if (resultado.success) {
      setEncontristas([]); setIsResetModalOpen(false); setResetPassword('');
      showToast('success', 'Sistema Zerado', 'Dados limpos com sucesso.');
    } else {
      setResetError(resultado.message);
    }
    setIsResetting(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setFileToImport(file); setIsImportConfirmOpen(true); }
    event.target.value = '';
  };

  const processFileImport = () => {
    if (!fileToImport) return;
    setImporting(true);
    Papa.parse(fileToImport, {
      header: false, skipEmptyLines: true, 
      complete: async (results) => {
        let count = 0;
        for (const parts of results.data as string[][]) {
          if (parts.length >= 2 && !(parts[0] && parts[0].trim().startsWith('#'))) {
            const nome = parts[1]?.trim();
            if (nome) {
                const { error } = await supabase.from('encontristas').insert({ 
                    nome: nome, alergias: parts[2]?.trim() || null, 
                    observacoes: parts[3]?.trim() || null, responsavel: parts[4]?.trim() || null, 
                    check_in: false 
                });
                if (!error) count++;
            }
          }
        }
        showToast('success', 'Importação Concluída', `${count} registros importados.`);
        setImporting(false); setIsImportConfirmOpen(false); setFileToImport(null); buscarEncontristas();
      },
      error: () => {
        showToast('error', 'Erro', 'Falha na leitura do arquivo.');
        setImporting(false);
      }
    });
  };

  const filtered = encontristas.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nome = p.nome || '';
    const responsavel = p.responsavel || '';
    return nome.toLowerCase().includes(term) || responsavel.toLowerCase().includes(term) || (term && p.id === Number(term));
  });

  const sorted = [...filtered].sort((a, b) => getStatusPessoa(b).prioridade - getStatusPessoa(a).prioridade);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      {/* HEADER FIXO PREMIUM */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <Image src="/favicon.ico" alt="Logo" width={36} height={36} className="w-9 h-9 rounded-xl shadow-sm" />
             <h1 className="text-xl md:text-2xl font-black text-orange-600 flex items-center gap-2">
               Face a Face <span className="hidden sm:inline-block text-[10px] font-black tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full uppercase">Igreja Batista Apascentar</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Link href="/dashboard/relatorio" className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors" title="Relatório">
                    <FileText size={22}/>
                </Link>
                <Link href="/dashboard/equipe" className="p-2.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors" title="Equipe">
                    <Shield size={22}/>
                </Link>
              </>
            )}
            <Link href="/dashboard/medicamentos" className="p-2.5 text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 rounded-xl shadow-sm transition-colors font-bold flex items-center gap-2">
                <Pill size={20}/><span className="hidden sm:inline">Farmácia</span>
            </Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                <LogOut size={22}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* STATS - COMPACTO E EXPANSÍVEL (OCUPA POUCO ESPAÇO) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
                onClick={() => setShowStats(!showStats)} 
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Activity className="text-orange-500 w-5 h-5" />
                    <span className="font-bold text-slate-700">Visão Geral</span>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Resumo rápido quando fechado */}
                    {!showStats && (
                        <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Inscritos: <span className="text-slate-700 text-xs ml-1">{totalEncontristas}</span></span>
                            <span className="text-emerald-500">Presentes: <span className="text-emerald-600 text-xs ml-1">{totalPresentes}</span></span>
                            <span className="text-rose-500">Ausentes: <span className="text-rose-600 text-xs ml-1">{totalAusentes}</span></span>
                        </div>
                    )}
                    <ChevronDown className={`text-slate-400 transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`} size={20} />
                </div>
            </button>

            {/* Conteúdo Expandido */}
            <div className={`transition-all duration-300 ease-in-out origin-top ${showStats ? 'max-h-40 border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/50">
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <Users size={20} className="text-blue-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscritos</p>
                        <p className="text-2xl font-black text-slate-800">{totalEncontristas}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <UserCheck size={20} className="text-emerald-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presentes</p>
                        <p className="text-2xl font-black text-emerald-600">{totalPresentes}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <UserX size={20} className="text-rose-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ausentes</p>
                        <p className="text-2xl font-black text-rose-600">{totalAusentes}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLES E BUSCA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input type="text" placeholder="Buscar por paciente, responsável ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all" />
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
                <>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".txt,.csv" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-none">
                        <Upload size={20} /> <span className="hidden lg:inline">Importar</span>
                    </button>
                    <button onClick={() => { setIsResetModalOpen(true); setResetError(null); }} className="bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 px-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-none">
                        <Trash2 size={20} /> <span className="hidden lg:inline">Zerar</span>
                    </button>
                </>
            )}
            <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all flex-1 sm:flex-none">
                <Plus size={22} /> <span className="md:inline">Novo</span>
            </button>
          </div>
        </div>

        {/* LISTA MOBILE PREMIUM */}
        <div className="md:hidden space-y-4">
          {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-10 h-10 animate-spin mx-auto mb-3"/>Carregando...</div> : sorted.length === 0 ? <div className="text-center py-12 text-slate-400 font-bold">Nenhum paciente encontrado.</div> : sorted.map((pessoa) => {
             const status = getStatusPessoa(pessoa);
             return (
              <div key={pessoa.id} className={`bg-white rounded-[2rem] border-l-8 ${status.bordaL} shadow-md border-y border-r border-slate-100 overflow-hidden active:scale-[0.98] transition-transform`}>
                <div className="p-5">
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex gap-4">
                            {/* Avatar com ID Laranja Escuro */}
                            <div className="w-12 h-12 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center font-black text-orange-700 shrink-0 text-sm shadow-inner">
                                {pessoa.id}
                            </div>
                            <div>
                                <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-lg font-black text-slate-800 leading-tight block mb-1">
                                    {pessoa.nome}
                                </Link>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-black uppercase tracking-wider ${status.cor}`}>
                                        {status.icone} {status.texto}
                                    </span>
                                </div>
                                {pessoa.responsavel && <p className="text-xs text-slate-500 font-medium mt-2">Resp: {pessoa.responsavel}</p>}
                            </div>
                        </div>
                        {/* Botão de Check-in Redondo */}
                        <button onClick={() => requestCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-all ${pessoa.check_in ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {pessoa.check_in ? <UserCheck size={24}/> : <UserX size={24}/>}
                        </button>
                    </div>

                    {pessoa.alergias && (
                        <div className="mt-4 flex items-start gap-3 bg-rose-50 p-3.5 rounded-2xl border border-rose-100">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0"/>
                            <div>
                                <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-0.5">Alergia / Atenção</p>
                                <p className="text-xs text-rose-700 font-bold leading-tight">{pessoa.alergias}</p>
                            </div>
                        </div>
                    )}
                </div>
              </div>
             )
          })}
        </div>

        {/* TABELA DESKTOP PREMIUM */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                        <th className="p-6">Status</th>
                        <th className="p-6">Paciente</th>
                        <th className="p-6 text-center">Check-in</th>
                        <th className="p-6">Responsável</th>
                        <th className="p-6">Alergias</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold">Carregando lista...</td></tr> : sorted.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold">Nenhum resultado encontrado.</td></tr> : sorted.map((pessoa) => {
                        const status = getStatusPessoa(pessoa);
                        return (
                        <tr key={pessoa.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="p-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.cor}`}>
                                    {status.icone} {status.texto}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    {/* Avatar com ID Laranja Escuro Desktop */}
                                    <div className="w-10 h-10 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center font-black text-orange-700 text-sm shrink-0 shadow-inner">
                                        {pessoa.id}
                                    </div>
                                    <div>
                                        <Link href={`/dashboard/encontrista/${pessoa.id}`} className="font-black text-slate-800 text-lg hover:text-orange-600 transition-colors">{pessoa.nome}</Link>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <button onClick={() => requestCheckIn(pessoa.id, pessoa.check_in, pessoa.nome)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border shadow-sm transition-all ${pessoa.check_in ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                    {pessoa.check_in ? <UserCheck size={16} /> : <UserX size={16} />} {pessoa.check_in ? 'Presente' : 'Ausente'}
                                </button>
                            </td>
                            <td className="p-6 text-slate-500 font-bold text-sm">{pessoa.responsavel || '-'}</td>
                            <td className="p-6">
                                {pessoa.alergias ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 max-w-[200px] truncate" title={pessoa.alergias}><AlertCircle size={14} className="shrink-0" /> <span className="truncate">{pessoa.alergias}</span></span> : <span className="text-slate-300 text-xs font-bold">-</span>}
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>

      </main>

      {/* --- MODAIS PREMIUM --- */}
      
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`flex items-center gap-4 p-5 rounded-[2rem] shadow-2xl border backdrop-blur-md min-w-[300px] bg-slate-800 text-white`}>
            {toast.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={28} /> : <AlertTriangle className="text-amber-400" size={28} />}
            <div className="flex-1">
              <h4 className="font-black text-sm">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-300 leading-tight mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
             <div className="p-6 flex justify-between items-center border-b border-slate-100">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Plus className="text-orange-600"/> Novo Paciente</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={20}/></button>
             </div>
             <form onSubmit={handleSalvar} className="p-6 space-y-5 bg-slate-50/50">
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Nome Completo</label><input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Ex: João Silva" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Opcional" /></div>
                    <div><label className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2 mb-1 block">Alergias</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl font-medium focus:ring-4 focus:ring-rose-500/10" placeholder="Se houver" /></div>
                </div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-1 block">Observações</label><textarea rows={3} value={novasObservacoes} onChange={e => setNovasObservacoes(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-4 focus:ring-orange-500/10" placeholder="Informações adicionais..." /></div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                    <button type="submit" disabled={saving} className="px-8 py-3 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-600/30 flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin h-5 w-5"/> : <><Save size={20}/> Cadastrar</>}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {isImportConfirmOpen && fileToImport && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><FileSpreadsheet size={32} /></div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Importar Lista?</h2>
                <p className="text-sm font-medium text-slate-500 mb-8 bg-slate-50 py-2 rounded-xl border border-slate-100 truncate px-4">{fileToImport.name}</p>
                <div className="flex gap-3">
                    <button onClick={() => setIsImportConfirmOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button onClick={processFileImport} disabled={importing} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/30">
                        {importing ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Importar'}
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* Modal Check-in */}
      {checkInTarget && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border border-slate-100">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${checkInTarget.status ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {checkInTarget.status ? <UserX size={32} /> : <UserCheck size={32} />}
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{checkInTarget.status ? 'Remover Presença?' : 'Confirmar Presença?'}</h2>
                <p className="text-slate-500 text-lg mb-8 font-bold">{checkInTarget.nome}</p>
                <div className="flex gap-3">
                    <button onClick={() => setCheckInTarget(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button onClick={confirmCheckIn} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg ${checkInTarget.status ? 'bg-rose-500 shadow-rose-500/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>Confirmar</button>
                </div>
            </div>
         </div>
      )}

      {/* Modal Zerar */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 text-center border border-rose-100">
             <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><AlertTriangle className="text-rose-600 w-10 h-10" /></div>
             <h2 className="text-rose-600 font-black text-2xl mb-2">Zerar Sistema?</h2>
             <p className="text-slate-500 font-medium mb-8">Essa ação apagará <strong className="text-rose-600">todos os pacientes e históricos</strong>. É irreversível.</p>
             <form onSubmit={handleZerarSistema} className="space-y-5">
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-4 py-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-center font-black text-rose-700 focus:ring-4 focus:ring-rose-500/20 placeholder:text-rose-300 placeholder:font-medium" placeholder="Digite sua senha de admin" />
                {resetError && <p className="text-rose-600 font-black text-xs bg-rose-50 py-2 rounded-xl">{resetError}</p>}
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancelar</button>
                    <button type="submit" disabled={isResetting} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-600/30">
                        {isResetting ? <Loader2 className="animate-spin h-6 w-6 mx-auto"/> : 'Apagar Tudo'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}