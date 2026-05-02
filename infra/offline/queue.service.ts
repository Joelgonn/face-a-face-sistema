import {
  type EntityRef,
  type QueueItem,
  type TempEntityType,
  type TempIdMappings,
  isTempIdMappingExpired,
} from '@/domain/offline/queue.types';

const QUEUE_STORAGE_KEY = 'offlineQueue';
const TEMP_ID_MAPPINGS_KEY = 'offlineTempIdMappings';

// Limite máximo da fila (evita crescimento infinito)
const MAX_QUEUE_SIZE = 1000;

// 🔥 Erro específico para version conflict
export class VersionConflictError extends Error {
  constructor(itemId: string, expected: number, actual: number) {
    super(`Version conflict for item ${itemId}: expected ${expected}, actual ${actual}`);
    this.name = 'VersionConflictError';
  }
}

// Erro específico para tempId mapping expirado
export class TempIdExpiredError extends Error {
  constructor(tempId: string, entity: string) {
    super(`TempId mapping expired for ${tempId} (entity: ${entity})`);
    this.name = 'TempIdExpiredError';
  }
}

export function isVersionConflictError(error: unknown): error is VersionConflictError {
  return error instanceof VersionConflictError;
}

export function isTempIdExpiredError(error: unknown): error is TempIdExpiredError {
  return error instanceof TempIdExpiredError;
}

// Validação estrutural com schema (evita corrupção)
function isValidQueueItem(item: unknown): item is QueueItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.tipo === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.retryCount === 'number' &&
    typeof candidate.status === 'string' &&
    typeof candidate.version === 'number'
  );
}

function isValidQueue(queue: unknown): queue is QueueItem[] {
  if (!Array.isArray(queue)) return false;
  return queue.every(isValidQueueItem);
}

// Validação rigorosa de mappings
function isValidMappings(mappings: unknown): mappings is TempIdMappings {
  if (!mappings || typeof mappings !== 'object') return false;
  const obj = mappings as Record<string, unknown>;
  
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.realId !== 'number') return false;
    if (typeof candidate.updatedAt !== 'string') return false;
    if (typeof candidate.entity !== 'string') return false;
  }
  
  return true;
}

function readJson<T>(key: string, fallback: T, validator?: (data: unknown) => data is T): T {
  if (typeof window === 'undefined') return fallback;

  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      console.warn(`[QUEUE_SERVICE] Invalid data for ${key}, using fallback`);
      return fallback;
    }
    return parsed as T;
  } catch {
    console.warn(`[QUEUE_SERVICE] Failed to parse ${key}, using fallback`);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function updateRefsWithMappings(item: QueueItem, mappings: TempIdMappings): QueueItem {
  const resolveRef = (ref: EntityRef): EntityRef => {
    if (ref.id !== undefined || !ref.tempId) return ref;
    const mapping = mappings[ref.tempId];
    return mapping ? { id: mapping.realId } : ref;
  };

  switch (item.tipo) {
    case 'criar_paciente':
      return item;
    case 'atualizar_paciente':
      return { ...item, payload: { ...item.payload, pacienteRef: resolveRef(item.payload.pacienteRef) } };
    case 'deletar_paciente':
      return { ...item, payload: { ...item.payload, pacienteRef: resolveRef(item.payload.pacienteRef) } };
    case 'criar_medicacao':
      return { ...item, payload: { ...item.payload, pacienteRef: resolveRef(item.payload.pacienteRef) } };
    case 'administrar_medicacao':
      return {
        ...item,
        payload: {
          ...item.payload,
          pacienteRef: resolveRef(item.payload.pacienteRef),
          prescricaoRef: resolveRef(item.payload.prescricaoRef),
        },
      };
    case 'deletar_medicacao':
      return { ...item, payload: { ...item.payload, medicacaoRef: resolveRef(item.payload.medicacaoRef) } };
    case 'deletar_historico':
      return { ...item, payload: { ...item.payload, historicoRef: resolveRef(item.payload.historicoRef) } };
    case 'checkin':
      return { ...item, payload: { ...item.payload, pacienteRef: resolveRef(item.payload.pacienteRef) } };
  }
}

// Promise-based lock mais limpo
let lockChain = Promise.resolve();

function acquireLock(): Promise<() => void> {
  let release!: () => void;

  const next = new Promise<void>(res => {
    release = res;
  });

  const prev = lockChain;
  lockChain = lockChain.then(() => next);

  return prev.then(() => release);
}

// 🔥 FIX 2: Debounce + deduplicação por timestamp para evitar duplicidade de eventos
let notifyTimeout: ReturnType<typeof setTimeout> | null = null;
let lastEventTimestamp = 0;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel('queue_service');
  
  window.addEventListener('beforeunload', () => {
    broadcastChannel?.close();
  });
}

type StorageEventCallback = () => void;
let storageCallbacks: StorageEventCallback[] = [];

function notifyStorageChange() {
  if (notifyTimeout) clearTimeout(notifyTimeout);
  
  notifyTimeout = setTimeout(() => {
    const now = Date.now();
    
    // 🔥 Deduplicação: se já processamos um evento muito próximo, ignora
    if (now - lastEventTimestamp < 50) {
      notifyTimeout = null;
      return;
    }
    
    lastEventTimestamp = now;
    storageCallbacks.forEach(cb => cb());
    broadcastChannel?.postMessage({ type: 'storage_change', timestamp: now });
    notifyTimeout = null;
  }, 50);
}

// Inicializar listener de storage (multi-tab)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === QUEUE_STORAGE_KEY || event.key === TEMP_ID_MAPPINGS_KEY) {
      notifyStorageChange();
    }
  });
  
  broadcastChannel?.addEventListener('message', (event) => {
    const data = event.data;
    if (data?.type === 'storage_change') {
      // 🔥 Se o timestamp da mensagem for muito antigo, ignora
      if (Date.now() - data.timestamp > 100) {
        return;
      }
      notifyStorageChange();
    }
  });
}

// 🔥 FIX 1: autoCleanDeadItems mantém ordem original 100%
function autoCleanDeadItems(queue: QueueItem[]): QueueItem[] {
  if (queue.length <= MAX_QUEUE_SIZE) return queue;
  
  // 🔥 Mantém ordem original completa
  const result: QueueItem[] = [];
  
  // Primeiro, adiciona todos os itens vivos (preservando ordem)
  for (const item of queue) {
    if (item.status !== 'dead') {
      result.push(item);
    }
  }
  
  // Se os vivos já excedem o limite, trunca mantendo ordem
  if (result.length > MAX_QUEUE_SIZE) {
    console.warn(`[QUEUE_SERVICE] Queue size (${result.length}) exceeds limit, trimming...`);
    return result.slice(0, MAX_QUEUE_SIZE);
  }
  
  // Depois, adiciona itens mortos (preservando ordem original) até o limite
  const deadSlotCount = MAX_QUEUE_SIZE - result.length;
  let deadAdded = 0;
  
  for (const item of queue) {
    if (item.status === 'dead' && deadAdded < deadSlotCount) {
      result.push(item);
      deadAdded++;
    }
  }
  
  return result;
}

export const queueService = {
  onExternalChange(callback: () => void): () => void {
    storageCallbacks.push(callback);
    return () => {
      storageCallbacks = storageCallbacks.filter(cb => cb !== callback);
    };
  },

  getQueue(): QueueItem[] {
    return readJson<QueueItem[]>(QUEUE_STORAGE_KEY, [], isValidQueue);
  },

  saveQueue(queue: QueueItem[]) {
    const cleanedQueue = autoCleanDeadItems(queue);
    writeJson(QUEUE_STORAGE_KEY, cleanedQueue);
    notifyStorageChange();
  },

  async enqueue(item: QueueItem): Promise<QueueItem> {
    const release = await acquireLock();
    try {
      let queue = this.getQueue();
      
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue = autoCleanDeadItems(queue);
      }
      
      queue.push(item);
      this.saveQueue(queue);
      return item;
    } finally {
      release();
    }
  },

  async updateItem(
    itemId: string,
    updater: (item: QueueItem) => Partial<QueueItem>,
    expectedVersion: number
  ): Promise<QueueItem> {
    const release = await acquireLock();
    try {
      const queue = this.getQueue();
      const index = queue.findIndex((item) => item.id === itemId);
      
      if (index === -1) {
        throw new Error(`Item ${itemId} not found`);
      }

      const currentItem = queue[index];

      if (currentItem.version !== expectedVersion) {
        throw new VersionConflictError(itemId, expectedVersion, currentItem.version);
      }

      const updates = updater(currentItem);
      const updatedItem = {
        ...currentItem,
        ...updates,
        version: currentItem.version + 1,
      } as QueueItem;

      queue[index] = updatedItem;
      this.saveQueue(queue);

      return updatedItem;
    } finally {
      release();
    }
  },

  async removeItem(itemId: string, expectedVersion: number): Promise<void> {
    const release = await acquireLock();
    try {
      const queue = this.getQueue();
      const index = queue.findIndex((item) => item.id === itemId);
      
      if (index === -1) {
        return;
      }

      const currentItem = queue[index];

      if (currentItem.version !== expectedVersion) {
        throw new VersionConflictError(itemId, expectedVersion, currentItem.version);
      }

      queue.splice(index, 1);
      this.saveQueue(queue);
    } finally {
      release();
    }
  },

  async clearQueue(): Promise<void> {
    const release = await acquireLock();
    try {
      writeJson(QUEUE_STORAGE_KEY, []);
      notifyStorageChange();
    } finally {
      release();
    }
  },

  getQueueCount() {
    return this.getQueue().length;
  },

  getTempIdMappings(): TempIdMappings {
    return readJson<TempIdMappings>(TEMP_ID_MAPPINGS_KEY, {}, isValidMappings);
  },

  saveTempIdMappings(mappings: TempIdMappings) {
    writeJson(TEMP_ID_MAPPINGS_KEY, mappings);
    notifyStorageChange();
  },

  registerTempIdMapping(tempId: string, entity: TempEntityType, realId: number) {
    const mappings = this.getTempIdMappings();
    mappings[tempId] = {
      entity,
      realId,
      updatedAt: new Date().toISOString(),
    };
    this.saveTempIdMappings(mappings);
  },

  resolveEntityRef(ref: EntityRef): number | null {
    if (ref.id !== undefined) return ref.id;
    if (!ref.tempId) return null;
    
    const mappings = this.getTempIdMappings();
    const mapping = mappings[ref.tempId];
    
    if (mapping && isTempIdMappingExpired(mapping)) {
      delete mappings[ref.tempId];
      this.saveTempIdMappings(mappings);
      throw new TempIdExpiredError(ref.tempId, mapping.entity);
    }
    
    return mapping?.realId ?? null;
  },

  resolveEntityRefSafe(ref: EntityRef): { success: true; id: number } | { success: false; expired: boolean } {
    if (ref.id !== undefined) {
      return { success: true, id: ref.id };
    }
    
    if (!ref.tempId) {
      return { success: false, expired: false };
    }
    
    const mappings = this.getTempIdMappings();
    const mapping = mappings[ref.tempId];
    
    if (!mapping) {
      return { success: false, expired: false };
    }
    
    if (isTempIdMappingExpired(mapping)) {
      delete mappings[ref.tempId];
      this.saveTempIdMappings(mappings);
      return { success: false, expired: true };
    }
    
    return { success: true, id: mapping.realId };
  },

  cleanExpiredTempMappings(): number {
    const mappings = this.getTempIdMappings();
    let cleaned = 0;
    
    for (const [tempId, mapping] of Object.entries(mappings)) {
      if (isTempIdMappingExpired(mapping)) {
        delete mappings[tempId];
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.saveTempIdMappings(mappings);
    }
    
    return cleaned;
  },
};