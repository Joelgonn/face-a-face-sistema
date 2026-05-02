import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import {
  assertNever,
  calculateBackoff,
  type EntityRef,
  type QueueItem,
} from '@/domain/offline/queue.types';
import { 
  queueService, 
  isVersionConflictError,
  isTempIdExpiredError,
  VersionConflictError 
} from '@/infra/offline/queue.service';

const MAX_RETRIES = 3;

// Lock de sincronização para evitar processamento concorrente
let isSyncing = false;

type SyncResult = {
  total: number;
  sucessos: number;
  falhas: number;
  dead: number;
  versionConflicts: number;
};

type SyncEngineDeps = {
  supabase: SupabaseClient<Database>;
};

function toNullable(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

async function resolveIdOrThrow(ref: EntityRef, entity: string) {
  const id = queueService.resolveEntityRef(ref);
  if (id === null) {
    throw new Error(`Nao foi possivel resolver ${entity} para sincronizacao.`);
  }
  return id;
}

async function ensurePaciente(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'criar_paciente' }>
) {
  const payload = item.payload;
  const offlineId = payload.offline_id;

  // 🔥 Busca por offline_id PRIMEIRO (evita duplicação)
  if (offlineId) {
    const { data: existing, error: lookupError } = await supabase
      .from('encontristas')
      .select('id')
      .eq('offline_id', offlineId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing) {
      queueService.registerTempIdMapping(payload.tempId, 'paciente', existing.id);
      return;
    }
  }

  const { data: created, error } = await supabase
    .from('encontristas')
    .insert({
      offline_id: offlineId,
      nome: payload.nome,
      responsavel: payload.responsavel,
      alergias: payload.alergias,
      observacoes: payload.observacoes,
      check_in: payload.check_in,
    })
    .select('id')
    .single();

  if (error || !created) throw error || new Error('Falha ao criar paciente.');

  queueService.registerTempIdMapping(payload.tempId, 'paciente', created.id);
}

async function processAtualizarPaciente(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'atualizar_paciente' }>
) {
  const pacienteId = await resolveIdOrThrow(item.payload.pacienteRef, 'paciente');

  const { error } = await supabase
    .from('encontristas')
    .update({
      nome: item.payload.nome,
      responsavel: item.payload.responsavel,
      alergias: item.payload.alergias,
      observacoes: item.payload.observacoes,
    })
    .eq('id', pacienteId)
    .select('id');

  if (error) throw error;
}

async function processDeletarPaciente(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'deletar_paciente' }>
) {
  const pacienteId = await resolveIdOrThrow(item.payload.pacienteRef, 'paciente');

  const { data: paciente, error: findError } = await supabase
    .from('encontristas')
    .select('id')
    .eq('id', pacienteId)
    .maybeSingle();

  if (findError) throw findError;
  
  if (!paciente) {
    console.log(`[SYNC_ENGINE] Paciente ${pacienteId} ja nao existe, delete ignorado`);
    return;
  }

  const { data: prescricoes, error: prescricoesError } = await supabase
    .from('prescricoes')
    .select('id')
    .eq('encontrista_id', pacienteId);

  if (prescricoesError) throw prescricoesError;

  const prescricaoIds = (prescricoes || []).map((prescricao) => prescricao.id);

  if (prescricaoIds.length > 0) {
    const { error: historicoError } = await supabase
      .from('historico_administracao')
      .delete()
      .in('prescricao_id', prescricaoIds);

    if (historicoError) throw historicoError;

    const { error: deletePrescricoesError } = await supabase
      .from('prescricoes')
      .delete()
      .eq('encontrista_id', pacienteId);

    if (deletePrescricoesError) throw deletePrescricoesError;
  }

  const { error: deletePacienteError } = await supabase
    .from('encontristas')
    .delete()
    .eq('id', pacienteId);

  if (deletePacienteError) throw deletePacienteError;
}

async function ensureMedicacao(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'criar_medicacao' }>
) {
  const pacienteId = await resolveIdOrThrow(item.payload.pacienteRef, 'paciente');
  const offlineId = item.payload.offline_id;

  // 🔥 Busca por offline_id PRIMEIRO (evita duplicação)
  let existingId: number | null = null;
  
  if (offlineId) {
    const { data: existingByOfflineId, error: lookupByOfflineIdError } = await supabase
      .from('prescricoes')
      .select('id')
      .eq('offline_id', offlineId)
      .maybeSingle();

    if (lookupByOfflineIdError) throw lookupByOfflineIdError;
    
    if (existingByOfflineId) {
      existingId = existingByOfflineId.id;
    }
  }

  // Fallback: busca por conteúdo (nome + horario + dosagem)
  if (!existingId) {
    const { data: existingByContent, error: lookupByContentError } = await supabase
      .from('prescricoes')
      .select('id')
      .eq('encontrista_id', pacienteId)
      .eq('nome_medicamento', item.payload.nome_medicamento)
      .eq('horario_inicial', item.payload.horario_inicial)
      .eq('dosagem', item.payload.dosagem)
      .maybeSingle();

    if (lookupByContentError) throw lookupByContentError;
    
    if (existingByContent) {
      existingId = existingByContent.id;
    }
  }

  if (existingId) {
    queueService.registerTempIdMapping(item.payload.tempId, 'medicacao', existingId);
    return;
  }

  // Não existe - criar novo
  const { data: created, error } = await supabase
    .from('prescricoes')
    .insert({
      offline_id: offlineId,
      encontrista_id: pacienteId,
      nome_medicamento: item.payload.nome_medicamento,
      dosagem: item.payload.dosagem,
      posologia: item.payload.posologia,
      horario_inicial: item.payload.horario_inicial,
    })
    .select('id')
    .single();

  if (error || !created) throw error || new Error('Falha ao criar medicacao.');

  queueService.registerTempIdMapping(item.payload.tempId, 'medicacao', created.id);
}

async function processAdministrarMedicacao(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'administrar_medicacao' }>
) {
  const pacienteId = await resolveIdOrThrow(item.payload.pacienteRef, 'paciente');
  const prescricaoId = await resolveIdOrThrow(item.payload.prescricaoRef, 'prescricao');
  const offlineId = item.payload.offline_id;

  // 🔥 Busca por offline_id primeiro (evita duplicação)
  if (offlineId) {
    const { data: existing, error: lookupError } = await supabase
      .from('historico_administracao')
      .select('id')
      .eq('offline_id', offlineId)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing) {
      // Já existe - nada a fazer, mas ainda precisa atualizar check-in
      const { error: checkinError } = await supabase
        .from('encontristas')
        .update({ check_in: true })
        .eq('id', pacienteId);

      if (checkinError) throw checkinError;
      return;
    }
  }

  // Não existe - criar
  const { error } = await supabase.from('historico_administracao').insert({
    offline_id: offlineId,
    prescricao_id: prescricaoId,
    data_hora: item.payload.data_hora,
    administrador: item.payload.administrador,
  });

  if (error) throw error;

  // Update check-in
  const { error: checkinError } = await supabase
    .from('encontristas')
    .update({ check_in: true })
    .eq('id', pacienteId);

  if (checkinError) throw checkinError;
}

async function processDeletarMedicacao(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'deletar_medicacao' }>
) {
  const medicacaoId = await resolveIdOrThrow(item.payload.medicacaoRef, 'medicacao');

  const { data: medicacao, error: findError } = await supabase
    .from('prescricoes')
    .select('id')
    .eq('id', medicacaoId)
    .maybeSingle();

  if (findError) throw findError;
  
  if (!medicacao) {
    console.log(`[SYNC_ENGINE] Medicacao ${medicacaoId} ja nao existe, delete ignorado`);
    return;
  }

  const { error: historicoError } = await supabase
    .from('historico_administracao')
    .delete()
    .eq('prescricao_id', medicacaoId);

  if (historicoError) throw historicoError;

  const { error } = await supabase.from('prescricoes').delete().eq('id', medicacaoId);
  if (error) throw error;
}

async function processDeletarHistorico(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'deletar_historico' }>
) {
  const historicoId = await resolveIdOrThrow(item.payload.historicoRef, 'historico');

  const { data: historico, error: findError } = await supabase
    .from('historico_administracao')
    .select('id')
    .eq('id', historicoId)
    .maybeSingle();

  if (findError) throw findError;
  
  if (!historico) {
    console.log(`[SYNC_ENGINE] Historico ${historicoId} ja nao existe, delete ignorado`);
    return;
  }

  const { error } = await supabase.from('historico_administracao').delete().eq('id', historicoId);
  if (error) throw error;
}

async function processCheckin(
  supabase: SupabaseClient<Database>,
  item: Extract<QueueItem, { tipo: 'checkin' }>
) {
  const pacienteId = await resolveIdOrThrow(item.payload.pacienteRef, 'paciente');
  const { error } = await supabase
    .from('encontristas')
    .update({ check_in: item.payload.check_in })
    .eq('id', pacienteId)
    .select('id');

  if (error) throw error;
}

// 🔥 FUNÇÃO AUXILIAR: Extrair tempId do payload do item
function extractTempIdFromItem(item: QueueItem): string | null {
  switch (item.tipo) {
    case 'criar_paciente':
      return item.payload.tempId;
    case 'criar_medicacao':
      return item.payload.tempId;
    case 'administrar_medicacao':
      // 🔥 CORREÇÃO: _tempId não existe mais no payload
      return null;
    case 'atualizar_paciente':
    case 'deletar_paciente':
    case 'deletar_medicacao':
    case 'deletar_historico':
    case 'checkin':
      return null;
    default:
      return null;
  }
}

// 🔥 DISPARAR EVENTO DE SUCESSO
function dispatchSyncSuccess(tempIds: string[]) {
  if (typeof window !== 'undefined' && tempIds.length > 0) {
    console.log('[SYNC_ENGINE] Disparando evento offline-sync-success com tempIds:', tempIds);
    window.dispatchEvent(
      new CustomEvent('offline-sync-success', {
        detail: { tempIds }
      })
    );
  }
}

async function processItemAndReturnTempId(
  supabase: SupabaseClient<Database>, 
  item: QueueItem
): Promise<string | null> {
  const tempId = extractTempIdFromItem(item);
  
  switch (item.tipo) {
    case 'criar_paciente':
      await ensurePaciente(supabase, item);
      return tempId;
    case 'atualizar_paciente':
      await processAtualizarPaciente(supabase, item);
      return null;
    case 'deletar_paciente':
      await processDeletarPaciente(supabase, item);
      return null;
    case 'criar_medicacao':
      await ensureMedicacao(supabase, item);
      return tempId;
    case 'administrar_medicacao':
      await processAdministrarMedicacao(supabase, item);
      return null; // não precisa de tempId para UI (pois não há optimistic update a limpar via tempId)
    case 'deletar_medicacao':
      await processDeletarMedicacao(supabase, item);
      return null;
    case 'deletar_historico':
      await processDeletarHistorico(supabase, item);
      return null;
    case 'checkin':
      await processCheckin(supabase, item);
      return null;
    default:
      return assertNever(item);
  }
}

export const syncEngine = {
  async process({ supabase }: SyncEngineDeps): Promise<SyncResult> {
    if (isSyncing) {
      console.warn('[SYNC_ENGINE] Sincronizacao ja em andamento, ignorando nova chamada');
      return { total: 0, sucessos: 0, falhas: 0, dead: 0, versionConflicts: 0 };
    }

    isSyncing = true;

    try {
      const fullQueue = queueService.getQueue();

      if (fullQueue.length === 0) {
        return { total: 0, sucessos: 0, falhas: 0, dead: 0, versionConflicts: 0 };
      }

      const readyItems = fullQueue.filter(item => {
        if (item.status === 'dead') return false;
        if (item.nextRetryAt && Date.now() < new Date(item.nextRetryAt).getTime()) return false;
        return true;
      });

      const queueMap = new Map(fullQueue.map(item => [item.id, item]));

      let sucessos = 0;
      let falhas = 0;
      let dead = 0;
      let versionConflicts = 0;
      const tempIdsSincronizados: string[] = [];

      for (const snapshotItem of readyItems) {
        const currentQueueItem = queueMap.get(snapshotItem.id);
        
        if (!currentQueueItem) continue;
        if (currentQueueItem.status === 'dead') continue;

        const itemToProcess = { ...currentQueueItem };
        let currentVersion = itemToProcess.version;

        if (itemToProcess.retryCount >= MAX_RETRIES) {
          try {
            await queueService.updateItem(
              itemToProcess.id,
              (item) => ({
                status: 'dead',
                lastError: item.lastError || 'Max retries exceeded',
              }),
              currentVersion
            );
            dead++;
          } catch (error) {
            if (isVersionConflictError(error)) {
              console.log(`[SYNC_ENGINE] Version conflict (normal) ao marcar ${itemToProcess.id} como dead, ignorando`);
              versionConflicts++;
              continue;
            }
            if (isTempIdExpiredError(error)) {
              console.warn(`[SYNC_ENGINE] TempId expired para ${itemToProcess.id}, marcando como dead`);
              dead++;
              continue;
            }
            throw error;
          }
          continue;
        }

        // Atualiza status para processing
        try {
          const updatedItem = await queueService.updateItem(
            itemToProcess.id,
            () => ({ status: 'processing' }),
            currentVersion
          );
          currentVersion = updatedItem.version;
        } catch (error) {
          if (isVersionConflictError(error)) {
            console.log(`[SYNC_ENGINE] Version conflict (normal) ao marcar ${itemToProcess.id} como processing, ignorando`);
            versionConflicts++;
            continue;
          }
          throw error;
        }

        try {
          const tempId = await processItemAndReturnTempId(supabase, itemToProcess);
          
          if (tempId) {
            tempIdsSincronizados.push(tempId);
          }
          
          try {
            await queueService.removeItem(itemToProcess.id, currentVersion);
            sucessos++;
          } catch (error) {
            if (isVersionConflictError(error)) {
              console.log(`[SYNC_ENGINE] Version conflict (normal) ao remover ${itemToProcess.id}, provavelmente ja foi removido`);
              versionConflicts++;
              sucessos++;
              continue;
            }
            throw error;
          }
        } catch (error) {
          if (isTempIdExpiredError(error)) {
            console.warn(`[SYNC_ENGINE] TempId expired para ${itemToProcess.id}, marcando como dead`);
            try {
              await queueService.updateItem(
                itemToProcess.id,
                (item) => ({
                  status: 'dead',
                  lastError: `TempId mapping expired: ${error.message}`,
                }),
                currentVersion
              );
              dead++;
            } catch (updateError) {
              if (isVersionConflictError(updateError)) {
                versionConflicts++;
              } else {
                throw updateError;
              }
            }
            continue;
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[SYNC_ENGINE] Falha ao processar item offline:', error, itemToProcess);
          
          const newRetryCount = itemToProcess.retryCount + 1;
          const backoffMs = calculateBackoff(newRetryCount);
          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
          
          const newStatus = newRetryCount >= MAX_RETRIES ? 'dead' : 'failed';
          
          try {
            const updatedItem = await queueService.updateItem(
              itemToProcess.id,
              (item) => ({
                retryCount: newRetryCount,
                status: newStatus,
                nextRetryAt: nextRetryAt,
                lastError: errorMessage,
              }),
              currentVersion
            );
            
            if (newRetryCount >= MAX_RETRIES) {
              dead++;
            } else {
              falhas++;
            }
          } catch (updateError) {
            if (isVersionConflictError(updateError)) {
              console.log(`[SYNC_ENGINE] Version conflict (normal) ao atualizar erro para ${itemToProcess.id}, ignorando`);
              versionConflicts++;
              continue;
            }
            throw updateError;
          }
        }
      }

      queueService.cleanExpiredTempMappings();

      if (tempIdsSincronizados.length > 0) {
        dispatchSyncSuccess(tempIdsSincronizados);
      }

      return {
        total: readyItems.length,
        sucessos,
        falhas,
        dead,
        versionConflicts,
      };
    } finally {
      isSyncing = false;
    }
  },
};