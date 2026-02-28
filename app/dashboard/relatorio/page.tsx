'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, FileText, Download, Printer, Loader2, Calendar, User, Pill, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';

// Interface dos dados "planificados" para o relatório
interface RegistroRelatorio {
  id: number;
  data_hora: string;
  administrador: string;
  medicamento: string;
  dosagem: string;
  paciente: string;
}

export default function RelatorioPage() {
  const [registros, setRegistros] = useState<RegistroRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const supabase = createClient();

  const carregarRelatorio = useCallback(async () => {
    const { data, error } = await supabase
      .from('historico_administracao')
      .select(`
        id,
        data_hora,
        administrador,
        prescricao:prescricoes (
            nome_medicamento,
            dosagem,
            encontrista:encontristas (nome)
        )
      `)
      .order('data_hora', { ascending: false });

    if (error) {
        console.error(error);
    } else if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatados = data.map((item: any) => ({
            id: item.id,
            data_hora: item.data_hora,
            administrador: item.administrador,
            medicamento: item.prescricao?.nome_medicamento || 'Excluído',
            dosagem: item.prescricao?.dosagem || '-',
            paciente: item.prescricao?.encontrista?.nome || 'Desconhecido'
        }));
        setRegistros(formatados);
    }
    setLoading(false);
  }, [supabase]);

  // =========================================================================
  // --- INÍCIO DA REFATORAÇÃO: VERIFICAÇÃO DE ADMIN NO BANCO DE DADOS ---
  // =========================================================================
  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
            // Consulta a tabela 'admins' do Supabase
            const { data: adminData } = await supabase
                .from('admins')
                .select('email')
                .eq('email', user.email)
                .single();

            // Se encontrou, a pessoa é admin, então carrega o relatório
            if (adminData) {
                setIsAdmin(true);
                carregarRelatorio();
            } else {
                // Se não é admin, redireciona de volta para o dashboard
                window.location.href = '/dashboard';
            }
        } else {
            // Se nem estiver logado, manda pro login/dashboard
            window.location.href = '/dashboard';
        }
    };
    init();
  }, [carregarRelatorio, supabase]);
  // =========================================================================
  // --- FIM DA REFATORAÇÃO ---
  // =========================================================================

  const handleExportCSV = () => {
    const headers = ["Data/Hora,Paciente,Medicamento,Dosagem,Aplicado Por"];
    const rows = registros.map(r => 
        `"${new Date(r.data_hora).toLocaleString('pt-BR')}","${r.paciente}","${r.medicamento}","${r.dosagem}","${r.administrador}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_medicacoes_face_a_face.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAdmin) return null; // Se não for admin, retorna nada enquanto o redirecionamento acontece
  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2"/> Gerando relatório...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto">
        
        {/* --- Header (Esconde na impressão) --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 print:hidden">
             <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-orange-600 font-medium transition-colors">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Voltar
                </Link>
                <h1 className="text-xl md:text-2xl font-bold text-orange-600 flex items-center gap-2">
                    <FileText className="text-orange-600" /> <span className="hidden sm:inline">Relatório Geral</span><span className="sm:hidden">Relatório</span>
                </h1>
             </div>
             
             <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handlePrint} className="flex-1 md:flex-none items-center justify-center gap-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-colors flex active:scale-95">
                    <Printer size={18} /> <span className="hidden sm:inline">Imprimir</span>
                </button>
                <button onClick={handleExportCSV} className="flex-1 md:flex-none items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-colors flex active:scale-95">
                    <Download size={18} /> <span className="hidden sm:inline">CSV</span><span className="sm:hidden">Exportar</span>
                </button>
             </div>
        </div>

        {/* --- Cabeçalho de Impressão --- */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-black">Relatório de Medicamentos</h1>
            <p className="text-sm text-gray-600">Face a Face - Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {/* --- MENSAGEM SE VAZIO --- */}
        {registros.length === 0 && (
            <div className="p-8 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-slate-200">
                Nenhum registro de medicação encontrado.
            </div>
        )}

        {/* --- VERSÃO MOBILE: CARDS (Visível apenas em telas pequenas e escondido na impressão) --- */}
        <div className="md:hidden print:hidden space-y-3">
            {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col gap-3">
                    {/* Linha 1: Paciente e Hora */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="bg-orange-50 p-2 rounded-full text-orange-500">
                                <User size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Paciente</p>
                                <p className="font-bold text-slate-800 text-lg leading-tight">{reg.paciente}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <Clock size={12} className="text-slate-400"/>
                                <span className="text-xs font-bold text-slate-600">
                                    {new Date(reg.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(reg.data_hora).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-50"></div>

                    {/* Linha 2: Remédio */}
                    <div className="flex items-center gap-3">
                        <Pill size={16} className="text-blue-400 shrink-0" />
                        <div>
                            <span className="font-bold text-slate-700">{reg.medicamento}</span>
                            <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                {reg.dosagem}
                            </span>
                        </div>
                    </div>

                    {/* Linha 3: Administrador */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                        <ShieldCheck size={14} className="text-slate-400"/>
                        <span>Aplicado por: <strong>{reg.administrador}</strong></span>
                    </div>
                </div>
            ))}
        </div>

        {/* --- VERSÃO DESKTOP: TABELA (Visível em telas médias+ e na Impressão) --- */}
        <div className="hidden md:block print:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-orange-50 text-orange-600 text-xs uppercase tracking-wider border-b border-orange-100 print:bg-gray-100 print:text-black">
                        <tr>
                            <th className="p-4">Data / Hora</th>
                            <th className="p-4">Paciente</th>
                            <th className="p-4">Medicamento</th>
                            <th className="p-4">Dosagem</th>
                            <th className="p-4">Aplicado Por</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50 print:divide-gray-300">
                        {registros.map((reg) => (
                            <tr key={reg.id} className="hover:bg-orange-50/50 transition-colors print:hover:bg-transparent">
                                <td className="p-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400 print:hidden"/>
                                        {new Date(reg.data_hora).toLocaleString('pt-BR')}
                                    </div>
                                </td>
                                <td className="p-4 font-bold text-slate-800">{reg.paciente}</td>
                                <td className="p-4 text-slate-700">{reg.medicamento}</td>
                                <td className="p-4 text-sm text-slate-500">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 text-xs font-bold print:border-0 print:bg-transparent print:p-0">
                                        {reg.dosagem}
                                    </span>
                                </td>
                                <td className="p-4 text-xs text-slate-500 font-mono">{reg.administrador}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="mt-4 text-right text-xs text-gray-400 print:mt-8 font-medium">
            Total de doses aplicadas: <strong className="text-orange-600 text-sm">{registros.length}</strong>
        </div>
      </div>
    </div>
  );
}