'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { zerarSistemaCompleto } from '@/app/actions/system';
import { Database } from '@/types/supabase'; 
import { 
  LogOut, Plus, Search, AlertCircle, Save, Loader2, Upload, Clock, X, 
  UserCheck, UserX, Users, Pill, Trash2, Lock, AlertTriangle, Shield,
  ChevronDown, FileText, CheckCircle2, FileSpreadsheet, ChevronRight, Activity, UserMinus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Papa from 'papaparse'; 

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

export default function DashboardClient({ 
  initialEncontristas, 
  isAdminInitial 
}: { initialEncontristas: EncontristaDashboard[], isAdminInitial: boolean }) {
  
  const [encontristas, setEncontristas] = useState<EncontristaDashboard[]>(initialEncontristas);
  const [isAdmin] = useState(isAdminInitial);
  const [loading, setLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [showStats, setShowStats] = useState(false);
  
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

  const totalInscritos = encontristas.length;
  const totalPresentes = encontristas.filter(p => p.check_in).length;
  const totalAusentes = totalInscritos - totalPresentes;

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000); 
  };

  const buscarEncontristas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('encontristas')
      .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
      .order('nome', { ascending: true });
    if (!error) setEncontristas((data as unknown) as EncontristaDashboard[] || []);
    setLoading(false);
  }, [supabase]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('encontristas').insert({ 
      nome: novoNome, responsavel: novoResponsavel, alergias: novasAlergias, observacoes: novasObservacoes, check_in: false 
    });
    if (!error) {
      setNovoNome(''); setNovoResponsavel(''); setNovasAlergias(''); setNovasObservacoes(''); 
      setIsModalOpen(false); showToast('success', 'Cadastrado!', 'Novo encontrista adicionado.');
      buscarEncontristas();
    }
    setSaving(false);
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
          if (parts.length >= 2 && !parts[0]?.startsWith('#')) {
            const nome = parts[1]?.trim();
            if (nome) {
                const { error } = await supabase.from('encontristas').insert({ 
                    nome, alergias: parts[2]?.trim(), observacoes: parts[3]?.trim(), responsavel: parts[4]?.trim()
                });
                if (!error) count++;
            }
          }
        }
        showToast('success', 'Importação', `${count} importados.`);
        setImporting(false); setIsImportConfirmOpen(false); setFileToImport(null);
        buscarEncontristas();
      }
    });
  };

  const handleZerarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    const resultado = await zerarSistemaCompleto(resetPassword);
    if (resultado.success) {
      setEncontristas([]); setIsResetModalOpen(false); setResetPassword('');
      showToast('success', 'Zerado', 'Sistema limpo.');
    } else { setResetError(resultado.message); }
    setIsResetting(false);
  };

  const confirmCheckIn = async () => {
    if (!checkInTarget) return;
    const { id, status } = checkInTarget;
    setEncontristas(prev => prev.map(p => p.id === id ? { ...p, check_in: !status } : p));
    setCheckInTarget(null);
    await supabase.from('encontristas').update({ check_in: !status }).eq('id', id);
  };

  const getStatusPessoa = (pessoa: EncontristaDashboard) => {
    if (!pessoa.prescricoes || pessoa.prescricoes.length === 0) {
      return { colorClass: 'border-l-slate-300', badge: 'bg-slate-100 text-slate-500', texto: 'Sem meds', dot: 'bg-slate-300', prioridade: 0 };
    }
    let statusGeral = 3; 
    for (const med of pessoa.prescricoes) {
      const match = med.posologia?.match(/(\d+)\s*(?:h|hora)/i);
      if (!match) continue; 
      const intervaloHoras = parseInt(match[1]);
      const ultimoRegistro = med.historico_administracao?.sort((a, b) => new Date(b.data_hora as string).getTime() - new Date(a.data_hora as string).getTime())[0];
      let dataBase = ultimoRegistro?.data_hora ? new Date(ultimoRegistro.data_hora as string) : null;
      if (!dataBase) {
        const [hora, minuto] = (med.horario_inicial || '00:00').split(':').map(Number);
        dataBase = new Date(new Date().setHours(hora, minuto, 0, 0));
      } else {
        dataBase = new Date(dataBase.getTime() + intervaloHoras * 60 * 60 * 1000);
      }
      const diffMinutos = (dataBase.getTime() - new Date().getTime()) / 1000 / 60;
      if (diffMinutos < 0) { statusGeral = 1; break; } 
      else if (diffMinutos < 30) { statusGeral = Math.min(statusGeral, 2); } 
    }
    if (statusGeral === 1) return { colorClass: 'border-l-red-500', badge: 'bg-red-100 text-red-700', texto: 'Atrasado', dot: 'bg-red-500', prioridade: 3 };
    if (statusGeral === 2) return { colorClass: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', texto: 'Atenção', dot: 'bg-amber-500', prioridade: 2 };
    return { colorClass: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', texto: 'Em dia', dot: 'bg-emerald-500', prioridade: 1 };
  };

  const filtered = useMemo(() => encontristas.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    return (p.nome || '').toLowerCase().includes(term) || (p.responsavel || '').toLowerCase().includes(term) || (term && p.id === Number(term));
  }), [encontristas, searchTerm]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => getStatusPessoa(b).prioridade - getStatusPessoa(a).prioridade), [filtered]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-full">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="brightness-0 invert" />
             </div>
             <div><h1 className="text-lg font-black text-slate-800 leading-tight">Face a Face</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apascentar</p></div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="hidden md:flex items-center gap-1 mr-2 bg-slate-100 p-1 rounded-xl">
                <Link href="/dashboard/relatorio" className="p-2 text-slate-500 hover:text-orange-600"><FileText size={20}/></Link>
                <Link href="/dashboard/equipe" className="p-2 text-slate-500 hover:text-orange-600"><Shield size={20}/></Link>
              </div>
            )}
            <Link href="/dashboard/medicamentos" className="p-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all"><Pill size={20}/><span className="hidden sm:inline">Meds</span></Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="p-2.5 text-slate-400 hover:text-red-600 active:bg-red-50 rounded-xl transition-all"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Users size={24} /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscritos</p><p className="text-2xl font-black text-slate-800">{totalInscritos}</p></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><UserCheck size={24} /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presentes</p><p className="text-2xl font-black text-slate-800">{totalPresentes}</p></div>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0"><UserMinus size={24} /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ausentes</p><p className="text-2xl font-black text-slate-800">{totalAusentes}</p></div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0">
                <button onClick={() => setIsModalOpen(true)} className="flex-1 lg:flex-none whitespace-nowrap bg-orange-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-100 active:scale-95 transition-all"><Plus size={20} /> Novo</button>
                {isAdmin && (
                    <>
                        <button onClick={() => fileInputRef.current?.click()} className="bg-white text-slate-600 border border-slate-200 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 active:bg-slate-50 transition-all"><Upload size={18} /> Importar</button>
                        <button onClick={() => setIsResetModalOpen(true)} className="bg-white text-red-500 border border-red-100 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 active:bg-red-50 transition-all"><Trash2 size={18} /> Zerar</button>
                    </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".txt,.csv" />
            </div>
        </div>

        {/* LISTA MOBILE */}
        <div className="md:hidden space-y-4">
            {loading ? <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500" /></div> : sorted.map((pessoa) => {
                const status = getStatusPessoa(pessoa);
                return (
                    <div key={pessoa.id} className={`bg-white rounded-[2rem] border-l-[10px] ${status.colorClass} shadow-md border border-slate-100 overflow-hidden active:scale-[0.98] transition-transform`}>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black border border-slate-100">{pessoa.nome?.[0].toUpperCase()}</div>
                                    <div>
                                        <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-300 tracking-tighter uppercase">ID {pessoa.id}</span><div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${status.badge}`}>{status.texto}</div></div>
                                        <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-lg font-black text-slate-800 block leading-tight">{pessoa.nome}</Link>
                                    </div>
                                </div>
                                <button onClick={() => setCheckInTarget({ id: pessoa.id, status: pessoa.check_in || false, nome: pessoa.nome || '' })} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${pessoa.check_in ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}>{pessoa.check_in ? <UserCheck size={22} /> : <UserX size={22} />}</button>
                            </div>
                            {pessoa.alergias && <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3 mb-3"><div className="bg-red-500 text-white p-1 rounded-lg"><AlertTriangle size={14} /></div><span className="text-xs font-black text-red-700 uppercase tracking-tight">{pessoa.alergias}</span></div>}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-slate-400">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"><Activity size={12} /> {pessoa.responsavel || 'Sem Responsável'}</div>
                                <Link href={`/dashboard/encontrista/${pessoa.id}`} className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1">Detalhes <ChevronRight size={14} /></Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* TABELA DESKTOP */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                        <th className="p-6">Status</th><th className="p-6">Encontrista</th><th className="p-6">Check-in</th><th className="p-6">Alergias</th><th className="p-6">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {sorted.map((pessoa) => {
                        const status = getStatusPessoa(pessoa);
                        return (
                            <tr key={pessoa.id} className="hover:bg-orange-50/30 transition-all group">
                                <td className="p-6"><span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.badge}`}><div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />{status.texto}</span></td>
                                <td className="p-6"><div className="flex flex-col"><Link href={`/dashboard/encontrista/${pessoa.id}`} className="font-black text-slate-800 text-lg hover:text-orange-600">{pessoa.nome}</Link><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resp: {pessoa.responsavel || '-'}</span></div></td>
                                <td className="p-6"><button onClick={() => setCheckInTarget({ id: pessoa.id, status: pessoa.check_in || false, nome: pessoa.nome || '' })} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${pessoa.check_in ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{pessoa.check_in ? 'Presente' : 'Ausente'}</button></td>
                                <td className="p-6">{pessoa.alergias ? <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-red-100">{pessoa.alergias}</span> : <span className="text-slate-200">—</span>}</td>
                                <td className="p-6"><Link href={`/dashboard/encontrista/${pessoa.id}`} className="p-3 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-xl transition-colors inline-block"><ChevronRight size={20} /></Link></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </main>

      {/* MODAL NOVO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-[3rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300">
             <div className="px-8 py-6 flex justify-between items-center border-b border-slate-50">
               <div><h2 className="text-2xl font-black text-slate-800">Novo Encontrista</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro manual</p></div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200"><X size={24}/></button>
             </div>
             <form onSubmit={handleSalvar} className="p-8 space-y-6">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Nome Completo</label><input type="text" required value={novoNome} onChange={e => setNovoNome(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:border-orange-500 text-slate-800 font-bold text-lg" placeholder="Nome do encontrista" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Responsável</label><input type="text" value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.2rem] focus:border-orange-500 text-slate-800 font-bold" placeholder="Quem trouxe?" /></div>
                    <div><label className="block text-[10px] font-black text-red-400 uppercase mb-3 ml-1 tracking-widest">Alergias Graves</label><input type="text" value={novasAlergias} onChange={e => setNovasAlergias(e.target.value)} className="w-full px-6 py-4 bg-red-50 border border-red-100 rounded-[1.2rem] focus:border-red-500 text-red-800 font-bold" placeholder="Ex: Dipirona" /></div>
                </div>
                <button type="submit" disabled={saving} className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl flex justify-center items-center gap-3">{saving ? <Loader2 className="animate-spin h-6 w-6"/> : <><Save size={22}/> Cadastrar</>}</button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL CHECK-IN */}
      {checkInTarget && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 transition-all">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${checkInTarget.status ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>{checkInTarget.status ? <UserX size={40} /> : <CheckCircle2 size={40} />}</div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">{checkInTarget.status ? 'Remover Presença?' : 'Confirmar Presença?'}</h2>
                <p className="text-slate-500 font-bold mb-8">{checkInTarget.nome}</p>
                <div className="flex gap-3"><button onClick={() => setCheckInTarget(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">Sair</button><button onClick={confirmCheckIn} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg ${checkInTarget.status ? 'bg-red-500 shadow-red-100' : 'bg-emerald-600 shadow-emerald-100'}`}>{checkInTarget.status ? 'Remover' : 'Confirmar'}</button></div>
            </div>
         </div>
      )}

      {/* MODAL ZERAR */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-200">
             <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><Trash2 size={40} className="text-red-500" /></div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">Zerar Sistema?</h2>
             <form onSubmit={handleZerarSistema} className="space-y-4">
                <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-black tracking-widest focus:border-red-500" placeholder="Senha" required /></div>
                {resetError && <p className="text-red-500 text-xs font-bold">{resetError}</p>}
                <div className="flex gap-3"><button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">Cancelar</button><button type="submit" disabled={isResetting} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100">{isResetting ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'ZERAR'}</button></div>
             </form>
          </div>
        </div>
      )}

      {/* IMPORT CONFIRM */}
      {isImportConfirmOpen && fileToImport && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><FileSpreadsheet size={40} className="text-orange-600" /></div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Importar?</h2>
                <p className="text-slate-500 font-bold mb-8 text-xs break-all">{fileToImport.name}</p>
                <div className="flex gap-3"><button onClick={() => setIsImportConfirmOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black">Cancelar</button><button onClick={processFileImport} disabled={importing} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-100">{importing ? <Loader2 className="animate-spin h-5 w-5 mx-auto"/> : 'CONFIRMAR'}</button></div>
            </div>
         </div>
      )}

      {/* MOBILE STATS HELPER */}
      {showStats && (
          <div className="md:hidden fixed inset-0 bg-slate-900/60 z-50 p-4 flex items-center justify-center">
              <div className="bg-white p-8 rounded-[2rem] w-full max-w-xs text-center relative">
                  <button onClick={() => setShowStats(false)} className="absolute top-4 right-4 text-slate-400"><X /></button>
                  <p className="text-slate-400 font-bold uppercase text-[10px] mb-4 tracking-widest">Resumo Detalhado</p>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Inscritos:</span><span className="font-black text-slate-800">{totalInscritos}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Presentes:</span><span className="font-black text-emerald-600">{totalPresentes}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Ausentes:</span><span className="font-black text-red-500">{totalAusentes}</span></div>
                  </div>
              </div>
          </div>
      )}

      {/* TOASTS */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300 w-[90%] max-w-md">
          <div className={`flex items-center gap-4 p-5 rounded-[2.5rem] shadow-2xl border backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-600/95 border-emerald-400 text-white' : 'bg-red-600/95 border-red-400 text-white'}`}>
            <div className="p-2 bg-white/20 rounded-xl">{toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}</div>
            <div className="flex-1"><h4 className="font-black text-sm uppercase tracking-widest">{toast.title}</h4><p className="text-xs font-bold opacity-90">{toast.message}</p></div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>
        </div>
      )}

      {/* HELPER PARA O ÍCONE CLOCK NO TABLE (Apenas p/ build passar) */}
      <div className="hidden"><Clock size={1} /><ChevronDown size={1} /></div>
    </div>
  );
}