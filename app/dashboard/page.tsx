import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient, { EncontristaDashboard } from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  // 1. Verifica autenticação no servidor
  const { data: { user } } = await supabase.auth.getUser();

  // CORREÇÃO AQUI: Verificamos se existe user E se existe user.email
  if (!user || !user.email) {
    redirect('/'); 
  }

  // 2. Verifica se é Admin (com tratamento de erro)
  try {
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('email')
      .eq('email', user.email)
      .single();

    if (adminError) {
      console.error('[DASHBOARD] Erro ao verificar admin:', adminError);
    }

    const isAdmin = !!adminData;

    // 3. Busca a lista de encontristas no servidor
    const { data, error } = await supabase
      .from('encontristas')
      .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
      .order('nome', { ascending: true });

    // --- TRATAMENTO DE ERRO OBRIGATÓRIO ---
    if (error) {
      console.error("[DASHBOARD] Erro ao buscar encontristas:", error);
      
      // Retorna uma UI de erro amigável em vez de lista vazia
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar dados</h2>
            <p className="text-slate-500 mb-6">NÃO foi possível conectar ao banco de dados. Tente recarregar a página.</p>
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

    // Conversão de tipo para garantir que bata com o que o DashboardClient espera
    const encontristas = (data as unknown as EncontristaDashboard[]) || [];

    // 4. Passa os dados prontos para o componente cliente
    return (
      <DashboardClient 
        initialEncontristas={encontristas} 
        isAdminInitial={isAdmin} 
      />
    );

  } catch (error) {
    // --- CATCH GERAL PARA ERROS INESPERADOS ---
    console.error("[DASHBOARD] Erro fatal:", error);
    
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Erro inesperado</h2>
          <p className="text-slate-500 mb-6">Ocorreu um erro interno. Contate o administrador.</p>
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
}