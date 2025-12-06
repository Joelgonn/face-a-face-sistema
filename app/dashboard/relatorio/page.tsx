'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { ArrowLeft, FileText, Download, Printer, Loader2, Calendar } from 'lucide-react';
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

  // Busca e formata os dados
  const carregarRelatorio = useCallback(async () => {
    // Join triplo: Historico -> Prescricao -> Encontrista
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
        // Formata os dados para ficarem fáceis de exibir
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

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        // Verifica Admin
        if (user?.email && (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').includes(user.email)) {
            setIsAdmin(true);
            carregarRelatorio();
        } else {
            // Se não for admin, manda de volta (ou mostra mensagem)
            window.location.href = '/dashboard';
        }
    };
    init();
  }, [carregarRelatorio, supabase]);

  // Função Exportar CSV
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

  // Função Imprimir
  const handlePrint = () => {
    window.print();
  };

  if (!isAdmin) return null; // Evita flash de conteúdo
  if (loading) return <div className="min-h-screen flex items-center justify-center text-orange-600"><Loader2 className="animate-spin mr-2"/> Gerando relatório...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto">
        
        {/* Header (Esconde na impressão) */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 print:hidden">
             <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-orange-600 font-medium transition-colors">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Voltar
                </Link>
                <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                    <FileText className="text-orange-600" /> Relatório Geral
                </h1>
             </div>
             
             <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handlePrint} className="flex-1 md:flex-none items-center justify-center gap-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex">
                    <Printer size={18} /> Imprimir
                </button>
                <button onClick={handleExportCSV} className="flex-1 md:flex-none items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex">
                    <Download size={18} /> Exportar CSV
                </button>
             </div>
        </div>

        {/* Cabeçalho de Impressão (Aparece só na impressão) */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-black">Relatório de Administração de Medicamentos</h1>
            <p className="text-sm text-gray-600">Face a Face - Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {/* Tabela de Relatório */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-orange-600 text-xs uppercase tracking-wider border-b border-slate-200 print:bg-gray-100 print:text-black">
                        <tr>
                            <th className="p-4">Data / Hora</th>
                            <th className="p-4">Paciente</th>
                            <th className="p-4">Medicamento</th>
                            <th className="p-4">Dosagem</th>
                            <th className="p-4">Aplicado Por</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-gray-300">
                        {registros.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum registro de medicação encontrado.</td></tr>
                        ) : (
                            registros.map((reg) => (
                                <tr key={reg.id} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                    <td className="p-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400 print:hidden"/>
                                            {new Date(reg.data_hora).toLocaleString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{reg.paciente}</td>
                                    <td className="p-4 text-slate-700">{reg.medicamento}</td>
                                    <td className="p-4 text-sm text-slate-500">{reg.dosagem}</td>
                                    <td className="p-4 text-xs text-slate-400 font-mono">{reg.administrador}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="mt-4 text-right text-xs text-gray-400 print:mt-8">
            Total de doses aplicadas: <strong>{registros.length}</strong>
        </div>
      </div>
    </div>
  );
}