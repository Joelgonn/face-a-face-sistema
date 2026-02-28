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

  // 2. Verifica se é Admin
  // Agora o TypeScript sabe que user.email é uma string, não undefined
  const { data: adminData } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email)
    .single();

  const isAdmin = !!adminData;

  // 3. Busca a lista de encontristas no servidor
  const { data, error } = await supabase
    .from('encontristas')
    .select(`*, prescricoes (id, posologia, horario_inicial, historico_administracao (data_hora))`)
    .order('nome', { ascending: true });

  if (error) {
    console.error("Erro ao buscar encontristas no servidor:", error);
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
}