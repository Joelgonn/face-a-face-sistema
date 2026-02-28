'use client';

import { useState, useMemo } from 'react';
import { 
  ArrowLeft, FileText, Download, Printer, Search, 
  Calendar, Pill, Clock, Activity, CheckCircle2, Users
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
  const [registros] = useState<RegistroRelatorio[]>(initialRegistros);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Lógica de Filtro
  const filtered = useMemo(() => {
    return registros.filter(reg => {
      const matchesSearch = 
        reg.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.medicamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.administrador.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? reg.data_hora.startsWith(filterDate) : true;
      return matchesSearch && matchesDate;
    });
  }, [registros, searchTerm, filterDate]);

  // Estatísticas para os Cards
  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const dosesHoje = registros.filter(r => r.data_hora.startsWith(hoje)).length;
    const pacientesUnicos = new Set(registros.map(r => r.paciente)).size;
    
    return {
      total: registros.length,
      hoje: dosesHoje,
      pacientes: pacientesUnicos
    };
  }, [registros]);

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
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- CABEÇALHO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
             <div className="flex items-center gap-5">
                <Link href="/dashboard" className="group p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm">
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                       <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><FileText size={28} /></div>
                       Relatório Geral
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Monitoramento de aplicações de medicamentos</p>
                </div>
             </div>
             
             <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => window.print()} className="flex-1 md:flex-none items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-2xl font-bold transition-all flex active:scale-95 shadow-sm">
                    <Printer size={20} /> Imprimir
                </button>
                <button onClick={handleExportCSV} className="flex-1 md:flex-none items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex active:scale-95">
                    <Download size={20} /> Salvar CSV
                </button>
             </div>
        </div>

        {/* --- CARDS DE RESUMO --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Activity size={28}/></div>
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total de Doses</p>
                    <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><CheckCircle2 size={28}/></div>
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Doses Hoje</p>
                    <p className="text-3xl font-black text-slate-800">{stats.hoje}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><Users size={28}/></div>
                <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pacientes Atendidos</p>
                    <p className="text-3xl font-black text-slate-800">{stats.pacientes}</p>
                </div>
            </div>
        </div>

        {/* --- FILTROS --- */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 print:hidden">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="text" 
                    placeholder="Pesquisar por paciente, medicamento ou responsável..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-700 placeholder:text-slate-400 transition-all"
                />
            </div>
            <div className="relative md:w-64">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-700 transition-all"
                />
            </div>
        </div>

        {/* --- TABELA --- */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden print:shadow-none print:border-0">
            <div className="overflow-x-auto">
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
                            <tr key={reg.id} className="hover:bg-orange-50/30 transition-all group">
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 font-bold text-base flex items-center gap-2">
                                            <Clock size={14} className="text-slate-300" />
                                            {new Date(reg.data_hora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium ml-5">
                                            {new Date(reg.data_hora).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                            {reg.paciente[0]}
                                        </div>
                                        <span className="font-bold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">{reg.paciente}</span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2 text-slate-600 font-semibold bg-slate-50 w-fit px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                        <Pill size={16} className="text-blue-500" />
                                        {reg.medicamento}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-xs border border-blue-100 shadow-sm">
                                        {reg.dosagem}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-sm font-bold text-slate-500">{formatarNome(reg.administrador)}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                        <Search size={40} />
                    </div>
                    <p className="text-slate-400 font-bold text-xl">Nenhum registro encontrado</p>
                    <p className="text-slate-300">Tente ajustar seus filtros de busca ou data.</p>
                </div>
            )}
        </div>

        <div className="mt-4 text-center text-slate-400 font-medium pb-10">
            Fim do Relatório • {filtered.length} aplicações registradas
        </div>
      </div>
    </div>
  );
}