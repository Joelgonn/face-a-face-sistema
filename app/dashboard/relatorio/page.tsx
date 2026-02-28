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

  if (error) console.error(error);

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