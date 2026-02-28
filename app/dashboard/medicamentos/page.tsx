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

  // 2. Busca a lista oficial de medicamentos (agora enxuta com 333 itens)
  const { data: medicamentos } = await supabase
    .from('medicamentos')
    .select('*')
    .order('nome', { ascending: true });

  // 3. Renderiza o componente cliente passando a lista
  return (
    <MedicamentosClient 
      initialMedicamentos={medicamentos || []} 
    />
  );
}