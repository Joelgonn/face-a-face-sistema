import { createClient } from '@/app/utils/supabase/server'
import { createEncontristaRepository } from '@/infra/repositories/encontrista.repository'
import { notFound } from 'next/navigation'
import { EncontristaContainer, HistoricoItem } from './EncontristaContainer'

type Props = {
  params: { id: string }
}

// Tipo completo que o Container espera
type MedicamentoCompleto = {
  id: number
  nome: string
  created_at: string
  cuidado: string | null
  dosagem: string | null
  indicacao: string | null
  posologia: string | null
}

export default async function Page({ params }: Props) {
  const id = Number(params.id)

  if (isNaN(id)) {
    return notFound()
  }

  const supabase = createClient()
  const repo = createEncontristaRepository(supabase)
  const { data, error } = await repo.findByIdWithDetails(id)

  if (error || !data) {
    console.error('[PAGE] Erro ao carregar paciente:', error)
    return notFound()
  }

  // Buscar base de medicamentos para autocomplete
  const { data: baseMedicamentos } = await supabase
    .from('medicamentos')
    .select('id, nome')
    .order('nome', { ascending: true })

  // --- ADAPTADOR (Anti-Corruption Layer) PARA MEDICAMENTOS ---
  // Converte o formato parcial do banco (id, nome) para o formato completo que o Container espera
  const medicamentosAdaptados: MedicamentoCompleto[] = (baseMedicamentos || []).map(m => ({
    id: m.id,
    nome: m.nome ?? '',
    created_at: '',
    cuidado: null,
    dosagem: null,
    indicacao: null,
    posologia: null
  }))

  // --- ADAPTADOR (Anti-Corruption Layer) PARA PACIENTE ---
  // Converte o formato do repository (EncontristaCompleto) para o formato que o Container espera (PacienteCompleto)
  const pacienteAdaptado = {
    ...data,
    prescricoes: data.prescricoes.map(p => ({
      ...p,
      encontrista_id: data.id,
      observacao: null
    })),
    // Garantimos que o histórico só contém itens com prescricao_id válido e tipamos corretamente
    historico: data.historico.filter(h => h.prescricao_id !== null) as HistoricoItem[]
  }

  return (
    <EncontristaContainer
      paciente={pacienteAdaptado}
      baseMedicamentos={medicamentosAdaptados}
    />
  )
}