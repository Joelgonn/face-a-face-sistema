import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import MedicamentosClient from './MedicamentosClient';

// Mantemos o force-dynamic para garantir que a lista atualize 
// sempre que você adicionar/remover um remédio no banco.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MedicamentosPage() {
  const supabase = createClient();

  // 1. Verifica autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect('/');
  }

  // 2. Busca a lista oficial de medicamentos com tratamento de erro
  const { data: medicamentos, error } = await supabase
    .from('medicamentos')
    .select('*')
    .order('nome', { ascending: true });

  // 3. TRATAMENTO DE ERRO OBRIGATÓRIO (mesmo padrão do dashboard)
  if (error) {
    console.error('[MEDICAMENTOS] Erro ao buscar lista:', error);

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar medicamentos</h2>
          <p className="text-slate-500 mb-6">Não foi possível conectar ao banco de dados. Tente recarregar a página.</p>
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

  // 4. Renderiza o componente cliente passando a lista (garantindo array mesmo se vazio)
  return (
    <MedicamentosClient 
      initialMedicamentos={medicamentos || []} 
    />
  );
}