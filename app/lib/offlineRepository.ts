import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { createClient } from '@/app/utils/supabase/client';
import { Database } from '@/types/supabase';

type EncontristaRow = Database['public']['Tables']['encontristas']['Row'];
type PrescricaoRow = Database['public']['Tables']['prescricoes']['Row'];
type HistoricoRow = Database['public']['Tables']['historico_administracao']['Row'];

export type CachedHistorico = HistoricoRow & {
  prescricao: Pick<PrescricaoRow, 'nome_medicamento' | 'dosagem'> | null;
};

export type CachedPacienteRecord = {
  id: number;
  paciente: EncontristaRow;
  medicacoes: PrescricaoRow[];
  historico: CachedHistorico[];
  updatedAt: string;
};

type PacienteSnapshot = Omit<CachedPacienteRecord, 'updatedAt'>;

interface OfflineDbSchema extends DBSchema {
  pacientes: {
    key: number;
    value: CachedPacienteRecord;
  };
}

const DB_NAME = 'face-a-face-offline';
const DB_VERSION = 1;
const PACIENTE_STORE = 'pacientes';
const DEFAULT_PRELOAD_LIMIT = 15;
const PRELOAD_BATCH_SIZE = 3;
const ROUTES_CACHE_NAME = 'dashboard-patient-pages';

let dbPromise: Promise<IDBPDatabase<OfflineDbSchema>> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

async function getDb() {
  if (!isBrowser()) return null;

  if (!dbPromise) {
    dbPromise = openDB<OfflineDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PACIENTE_STORE)) {
          db.createObjectStore(PACIENTE_STORE, { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

function toAbsoluteUrl(url: string): string {
  if (!isBrowser()) return url;
  return new URL(url, window.location.origin).href;
}

async function chunkedAll<T>(items: T[], worker: (item: T) => Promise<void>, chunkSize = PRELOAD_BATCH_SIZE) {
  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    await Promise.allSettled(chunk.map(worker));
  }
}

async function fetchPacienteSnapshot(id: number): Promise<PacienteSnapshot | null> {
  const supabase = createClient();

  const { data: paciente, error: pacienteError } = await supabase
    .from('encontristas')
    .select('*')
    .eq('id', id)
    .single();

  if (pacienteError || !paciente) {
    return null;
  }

  const { data: medicacoes, error: medicacoesError } = await supabase
    .from('prescricoes')
    .select('*')
    .eq('encontrista_id', id)
    .order('id', { ascending: true });

  if (medicacoesError) {
    return null;
  }

  const prescricaoIds = (medicacoes || []).map((medicacao) => medicacao.id);
  let historico: CachedHistorico[] = [];

  if (prescricaoIds.length > 0) {
    const { data: historicoData, error: historicoError } = await supabase
      .from('historico_administracao')
      .select(`
        *,
        prescricao:prescricoes (
          nome_medicamento,
          dosagem
        )
      `)
      .in('prescricao_id', prescricaoIds)
      .order('data_hora', { ascending: false });

    if (historicoError) {
      return null;
    }

    historico = (historicoData || []) as CachedHistorico[];
  }

  return {
    id,
    paciente,
    medicacoes: medicacoes || [],
    historico,
  };
}

export async function getPaciente(id: number): Promise<CachedPacienteRecord | null> {
  const db = await getDb();
  if (!db) return null;
  return (await db.get(PACIENTE_STORE, id)) ?? null;
}

export async function savePaciente(data: PacienteSnapshot): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.put(PACIENTE_STORE, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePaciente(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(PACIENTE_STORE, id);
}

export async function clearPacientes(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.clear(PACIENTE_STORE);
}

export async function hasRouteCache(url: string): Promise<boolean> {
  if (!isBrowser() || typeof caches === 'undefined') return false;
  
  try {
    const absoluteUrl = toAbsoluteUrl(url);
    const cache = await caches.open(ROUTES_CACHE_NAME);
    const response = await cache.match(absoluteUrl, { ignoreSearch: true });
    return Boolean(response);
  } catch (error) {
    console.warn('[HAS_ROUTE_CACHE] erro:', error);
    return false;
  }
}

export async function precacheRoute(url: string): Promise<boolean> {
  if (!isBrowser() || typeof caches === 'undefined') {
    console.warn('[PRECACHE] Browser ou caches indisponível');
    return false;
  }

  const absoluteUrl = toAbsoluteUrl(url);

  if (navigator.serviceWorker?.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PATIENT_PAGE',
        url: absoluteUrl,
      });
      console.log(`[PRECACHE] Mensagem enviada ao SW para: ${url}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cached = await hasRouteCache(absoluteUrl);
      if (cached) {
        console.log(`[PRECACHE] Cache confirmado via SW: ${url}`);
        return true;
      }
    } catch (err) {
      console.warn('[PRECACHE] Erro no postMessage:', err);
    }
  }

  const cached = await hasRouteCache(absoluteUrl);
  if (cached) {
    console.log(`[PRECACHE] Já cacheado (fallback): ${url}`);
    return true;
  }

  try {
    console.log(`[PRECACHE] Buscando (fallback): ${url}`);
    
    const response = await fetch(absoluteUrl, {
      credentials: 'same-origin',
      headers: {
        'X-Precache': 'true',
      },
    });

    if (!response.ok) {
      console.warn(`[PRECACHE] Resposta não OK: ${response.status} para ${url}`);
      return false;
    }

    const cache = await caches.open(ROUTES_CACHE_NAME);
    await cache.put(absoluteUrl, response.clone());
    
    console.log(`[PRECACHE] Cacheado com sucesso (fallback): ${url}`);
    return true;
  } catch (error) {
    console.warn(`[PRECACHE] Erro ao cachear ${url}:`, error);
    return false;
  }
}

export async function preloadPacienteById(id: number): Promise<void> {
  await precacheRoute(`/dashboard/encontrista/${id}`);

  const snapshot = await fetchPacienteSnapshot(id);
  if (snapshot) {
    await savePaciente(snapshot);
  }
}

// 🔥 REMOVIDA A VERIFICAÇÃO `!navigator.onLine` – agora tenta mesmo offline (as requisições falham silenciosamente)
export async function preloadPacientes(ids: number[], limit = DEFAULT_PRELOAD_LIMIT): Promise<void> {
  if (!isBrowser()) return;

  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0))).slice(0, limit);
  await chunkedAll(uniqueIds, preloadPacienteById);
}

export async function clearRouteCache(): Promise<void> {
  if (!isBrowser() || typeof caches === 'undefined') return;
  
  try {
    const cache = await caches.open(ROUTES_CACHE_NAME);
    const keys = await cache.keys();
    
    for (const request of keys) {
      await cache.delete(request);
    }
    
    console.log(`[CACHE] Limpo: ${keys.length} rotas removidas`);
  } catch (error) {
    console.warn('[CACHE] Erro ao limpar cache:', error);
  }
}

export async function listCachedRoutes(): Promise<string[]> {
  if (!isBrowser() || typeof caches === 'undefined') return [];
  
  try {
    const cache = await caches.open(ROUTES_CACHE_NAME);
    const keys = await cache.keys();
    return keys.map(request => request.url);
  } catch (error) {
    console.warn('[CACHE] Erro ao listar rotas:', error);
    return [];
  }
}

export async function getAllPacientes(): Promise<CachedPacienteRecord[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.getAll(PACIENTE_STORE);
}