import {
  clearPacientes,
  deletePaciente,
  getPaciente,
  savePaciente,
  type CachedPacienteRecord,
} from '@/app/lib/offlineRepository';

export type CachedPacienteData = CachedPacienteRecord;

export async function savePacienteToCache(
  id: number,
  data: Omit<CachedPacienteRecord, 'id' | 'updatedAt'>
): Promise<void> {
  await savePaciente({
    id,
    paciente: data.paciente,
    medicacoes: data.medicacoes,
    historico: data.historico,
  });
}

export async function getPacienteFromCache(id: number): Promise<CachedPacienteData | null> {
  return getPaciente(id);
}

export async function clearPacienteCache(id: number): Promise<void> {
  await deletePaciente(id);
}

export async function clearAllPacienteCache(): Promise<void> {
  await clearPacientes();
}
