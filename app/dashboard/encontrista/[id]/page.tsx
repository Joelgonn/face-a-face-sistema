import { createClient } from '@/app/utils/supabase/server';
import { redirect } from 'next/navigation';
import EncontristaClient, { HistoricoItem } from './EncontristaClient';

export default async function EncontristaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { id } = params;

  // CONVERSÃO DE TIPO: Transforma a string do parâmetro em número
  const idNum = parseInt(id, 10);

  // 1. Verifica autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect('/');
  }

  // 2. Busca dados do Encontrista usando o número convertido
  const { data: pessoa } = await supabase
    .from('encontristas')
    .select('*')
    .eq('id', idNum) // Agora idNum é um número
    .single();

  if (!pessoa) {
    return <div className="p-10 text-center text-gray-500">Encontrista não encontrado.</div>;
  }

  // 3. Busca Prescrições
  const { data: medicacoes } = await supabase
    .from('prescricoes')
    .select('*')
    .eq('encontrista_id', idNum);

  const meds = medicacoes || [];
  const medIds = meds.map(m => m.id);

  // 4. Busca Histórico (apenas se houver prescrições)
  let historico: HistoricoItem[] = [];
  
  if (medIds.length > 0) {
    const { data: historicoData } = await supabase
        .from('historico_administracao')
        .select(`*, prescricao:prescricoes (nome_medicamento, dosagem)`)
        .in('prescricao_id', medIds)
        .order('data_hora', { ascending: false });
    
    if (historicoData) {
        historico = historicoData as unknown as HistoricoItem[];
    }
  }

  // 5. Busca Base de Medicamentos
  const { data: baseMedicamentos } = await supabase
    .from('medicamentos')
    .select('*')
    .order('nome');

  // 6. Renderiza o Cliente
  return (
    <EncontristaClient 
      id={idNum}
      initialPessoa={pessoa}
      initialMedicacoes={meds}
      initialHistorico={historico}
      baseMedicamentos={baseMedicamentos || []}
    />
  );
}