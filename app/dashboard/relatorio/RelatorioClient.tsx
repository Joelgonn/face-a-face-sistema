'use client';

import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Download, Printer, Search, 
  Calendar, Pill, Clock, Activity, CheckCircle2, Users,
  ShieldCheck, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export interface RegistroRelatorio {
  id: number;
  data_hora: string;
  administrador: string;
  medicamento: string;
  dosagem: string;
  paciente: string;
}

export default function RelatorioClient({ initialRegistros }: { initialRegistros: RegistroRelatorio[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showStats, setShowStats] = useState(false); // NOVO: Controle da Visão Geral

  const filtered = useMemo(() => {
    return initialRegistros.filter(reg => {
      const matchesSearch = 
        reg.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.medicamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.administrador.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? reg.data_hora.startsWith(filterDate) : true;
      return matchesSearch && matchesDate;
    });
  }, [initialRegistros, searchTerm, filterDate]);

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const dosesHoje = initialRegistros.filter(r => r.data_hora.startsWith(hoje)).length;
    const pacientesUnicos = new Set(initialRegistros.map(r => r.paciente)).size;
    return { total: initialRegistros.length, hoje: dosesHoje, pacientes: pacientesUnicos };
  }, [initialRegistros]);

  const formatarNome = (email: string) => {
    const parte = email.split('@')[0];
    return parte.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleExportCSV = () => {
    const headers = ["Data,Hora,Paciente,Medicamento,Dosagem,Aplicado Por"];
    const rows = filtered.map(r => {
        const d = new Date(r.data_hora);
        return `"${d.toLocaleDateString('pt-BR')}","${d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}","${r.paciente}","${r.medicamento}","${r.dosagem}","${r.administrador}"`;
    });
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_face_a_face.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* HEADER FIXO MOBILE / DESKTOP */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2 text-slate-400 hover:text-orange-600 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl md:text-2xl font-black text-slate-800">Relatório</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 shadow-sm md:flex md:items-center md:gap-2 md:px-4 transition-colors">
                    <Printer size={20} /> <span className="hidden md:inline font-bold">Imprimir</span>
                </button>
                <button onClick={handleExportCSV} className="p-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white shadow-lg shadow-emerald-600/30 md:flex md:items-center md:gap-2 md:px-4 transition-colors">
                    <Download size={20} /> <span className="hidden md:inline font-bold">Salvar CSV</span>
                </button>
            </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* STATS - COMPACTO E EXPANSÍVEL */}
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
                    {/* Resumo rápido quando fechado no desktop */}
                    {!showStats && (
                        <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Total: <span className="text-slate-700 text-xs ml-1">{stats.total}</span></span>
                            <span className="text-emerald-500">Hoje: <span className="text-emerald-600 text-xs ml-1">{stats.hoje}</span></span>
                            <span className="text-purple-500">Pacientes: <span className="text-purple-600 text-xs ml-1">{stats.pacientes}</span></span>
                        </div>
                    )}
                    <ChevronDown className={`text-slate-400 transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`} size={20} />
                </div>
            </button>

            {/* Conteúdo Expandido */}
            <div className={`transition-all duration-300 ease-in-out origin-top ${showStats ? 'max-h-40 border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/50">
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <Activity size={20} className="text-blue-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Doses</p>
                        <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 size={20} className="text-emerald-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doses Hoje</p>
                        <p className="text-2xl font-black text-emerald-600">{stats.hoje}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                        <Users size={20} className="text-purple-500 mb-1" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pacientes</p>
                        <p className="text-2xl font-black text-purple-600">{stats.pacientes}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* FILTROS MODERNOS */}
        <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Buscar paciente ou medicamento..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 font-medium text-slate-700 shadow-sm transition-all"
                />
            </div>
            <div className="relative md:w-64">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 shadow-sm focus:ring-4 focus:ring-orange-500/10 transition-all"
                />
            </div>
        </div>

        {/* LISTA DE REGISTROS - VERSÃO PREMIUM MOBILE */}
        <div className="md:hidden space-y-4">
            {filtered.map((reg) => (
                <div key={reg.id} className="bg-white rounded-[2rem] border-l-8 border-l-orange-500 shadow-md border-y border-r border-slate-100 overflow-hidden active:scale-[0.98] transition-transform">
                    <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center text-orange-700 font-black uppercase text-sm shadow-inner shrink-0">
                                    {reg.paciente[0]}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg leading-tight">{reg.paciente}</h3>
                                    <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            {new Date(reg.data_hora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} • {new Date(reg.data_hora).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-[10px] border border-blue-100 shrink-0 mt-1">
                                {reg.dosagem}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 border border-slate-100">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500"><Pill size={18}/></div>
                            <span className="font-bold text-slate-700 text-sm uppercase tracking-tight">{reg.medicamento}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><ShieldCheck size={14}/></div>
                                <span className="text-xs font-bold text-slate-500">{formatarNome(reg.administrador)}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-300">ID: {reg.id}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* TABELA - VERSÃO DESKTOP */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                        <th className="p-6">Data / Hora</th>
                        <th className="p-6">Paciente</th>
                        <th className="p-6">Medicamento</th>
                        <th className="p-6">Dosagem</th>
                        <th className="p-6">Aplicado Por</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filtered.map((reg) => (
                        <tr key={reg.id} className="hover:bg-orange-50/40 transition-all group">
                            <td className="p-6 text-slate-700 font-bold">
                                {new Date(reg.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-100 border border-orange-200 rounded-full flex items-center justify-center text-orange-700 font-black text-sm shrink-0 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                        {reg.paciente[0]}
                                    </div>
                                    <span className="font-black text-slate-800 text-lg group-hover:text-orange-600 transition-colors">{reg.paciente}</span>
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-2 text-slate-600 font-bold bg-slate-50 w-fit px-3 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                    <Pill size={16} className="text-blue-500" />
                                    {reg.medicamento}
                                </div>
                            </td>
                            <td className="p-6"><span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider border border-blue-100 uppercase">{reg.dosagem}</span></td>
                            <td className="p-6">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-500">{formatarNome(reg.administrador)}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Search size={40} />
                </div>
                <p className="text-slate-400 font-black text-xl">Nenhum registro encontrado</p>
                <p className="text-slate-400 font-medium text-sm mt-2">Tente buscar por outro termo ou data.</p>
            </div>
        )}
      </main>
    </div>
  );
}