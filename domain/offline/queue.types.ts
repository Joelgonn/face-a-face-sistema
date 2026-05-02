// queue.types.ts
export type QueueStatus = 'pending' | 'processing' | 'failed' | 'dead';

// EntityRef agora é uma união exaustiva e segura.
// Ou tem id (real) ou tem tempId (offline), nunca ambos, nunca nenhum.
export type EntityRef =
  | { id: number; tempId?: never }
  | { tempId: string; id?: never };

export type TempEntityType = 'paciente' | 'medicacao' | 'historico';

// 🔥 Adicionado version para controle de concorrência otimista
export type BaseQueueItem<TTipo extends QueueItemTipo, TPayload> = {
  id: string;
  tipo: TTipo;
  payload: TPayload;
  createdAt: string;
  retryCount: number;
  status: QueueStatus;
  nextRetryAt: string | null;
  lastError: string | null;
  version: number; // <-- NOVO: para evitar race conditions em updates concorrentes
};

export type CriarPacientePayload = {
  tempId: string;
  offline_id: string;
  nome: string;
  responsavel: string | null;
  alergias: string | null;
  observacoes: string | null;
  check_in: boolean;
};

export type AtualizarPacientePayload = {
  pacienteRef: EntityRef;
  nome: string;
  responsavel: string | null;
  alergias: string | null;
  observacoes: string | null;
};

export type DeletarPacientePayload = {
  pacienteRef: EntityRef;
};

export type CriarMedicacaoPayload = {
  tempId: string;
  offline_id: string;
  pacienteRef: EntityRef;
  nome_medicamento: string;
  dosagem: string;
  posologia: string;
  horario_inicial: string;
};

export type AdministrarMedicacaoPayload = {
  offline_id: string;
  pacienteRef: EntityRef;
  prescricaoRef: EntityRef;
  data_hora: string;
  administrador: string;
};

export type DeletarMedicacaoPayload = {
  medicacaoRef: EntityRef;
};

export type DeletarHistoricoPayload = {
  historicoRef: EntityRef;
};

export type CheckinPayload = {
  pacienteRef: EntityRef;
  check_in: boolean;
};

export type QueueItem =
  | BaseQueueItem<'criar_paciente', CriarPacientePayload>
  | BaseQueueItem<'atualizar_paciente', AtualizarPacientePayload>
  | BaseQueueItem<'deletar_paciente', DeletarPacientePayload>
  | BaseQueueItem<'criar_medicacao', CriarMedicacaoPayload>
  | BaseQueueItem<'administrar_medicacao', AdministrarMedicacaoPayload>
  | BaseQueueItem<'deletar_medicacao', DeletarMedicacaoPayload>
  | BaseQueueItem<'deletar_historico', DeletarHistoricoPayload>
  | BaseQueueItem<'checkin', CheckinPayload>;

export type QueueItemTipo = QueueItem['tipo'];

export type QueuePayloadByTipo = {
  criar_paciente: CriarPacientePayload;
  atualizar_paciente: AtualizarPacientePayload;
  deletar_paciente: DeletarPacientePayload;
  criar_medicacao: CriarMedicacaoPayload;
  administrar_medicacao: AdministrarMedicacaoPayload;
  deletar_medicacao: DeletarMedicacaoPayload;
  deletar_historico: DeletarHistoricoPayload;
  checkin: CheckinPayload;
};

export const TEMP_ID_MAPPING_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export type TempIdMapping = {
  entity: TempEntityType;
  realId: number;
  updatedAt: string;
};

export type TempIdMappings = Record<string, TempIdMapping>;

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTempId(entity: TempEntityType) {
  return createId(`tmp_${entity}`);
}

export function createOfflineId(): string {
  return createId('offline');
}

// 🔥 Backoff exponencial: usa o PRÓXIMO retryCount (o que virá)
export function calculateBackoff(nextRetryCount: number): number {
  // nextRetryCount é o número de tentativas que SERÁ FEITO (1, 2, 3...)
  const backoffSeconds = Math.min(Math.pow(2, nextRetryCount), 60);
  return backoffSeconds * 1000;
}

export function isTempIdMappingExpired(mapping: TempIdMapping): boolean {
  const updatedAt = new Date(mapping.updatedAt).getTime();
  const now = Date.now();
  return (now - updatedAt) > TEMP_ID_MAPPING_TTL_MS;
}

export function createQueueItem<TTipo extends QueueItemTipo>(
  tipo: TTipo,
  payload: QueuePayloadByTipo[TTipo]
): Extract<QueueItem, { tipo: TTipo }> {
  return {
    id: createId('queue'),
    tipo,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
    nextRetryAt: null,
    lastError: null,
    version: 1, // <-- NOVO: versão inicial
  } as Extract<QueueItem, { tipo: TTipo }>;
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled queue item: ${JSON.stringify(value)}`);
}