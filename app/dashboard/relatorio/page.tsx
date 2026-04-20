import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import RelatorioClient, { RegistroRelatorio } from './RelatorioClient';

export const dynamic = 'force-dynamic';

// Definimos exatamente como os dados brutos chegam do banco para o TS não reclamar
interface RawRelatorioItem {
  id: number;
  data_hora: string;
  administrador: string;
  prescricao: {
    nome_medicamento: string;
    dosagem: string;
    encontrista: {
      nome: string;
    } | null;
  } | null;
}

export default async function RelatorioPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect('/');

  const { data: adminData } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email)
    .single();

  if (!adminData) redirect('/dashboard');

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

  // --- TRATAMENTO DE ERRO OBRIGATÓRIO (mesmo padrão do dashboard) ---
  if (error) {
    console.error('[RELATORIO] Erro ao buscar dados:', error);

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar relatório</h2>
          <p className="text-slate-500 mb-6">Não foi possível buscar os dados do histórico. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            🔄 Recarregar página
          </button>
        </div>
      </div>
    );
  }

  // Mapeamento usando a interface RawRelatorioItem para garantir tipagem forte
  const registros: RegistroRelatorio[] = (data as unknown as RawRelatorioItem[] || []).map((item) => ({
    id: item.id,
    data_hora: item.data_hora,
    administrador: item.administrador || 'Desconhecido',
    medicamento: item.prescricao?.nome_medicamento || 'Excluído',
    dosagem: item.prescricao?.dosagem || '-',
    paciente: item.prescricao?.encontrista?.nome || 'Desconhecido'
  }));

  return <RelatorioClient initialRegistros={registros} />;
}