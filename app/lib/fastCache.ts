'use client';

const KEY = 'dashboard_fast_cache_v2'; // versionado
const TTL = 1000 * 60 * 5; // 5 minutos
const MAX_SIZE_BYTES = 500_000; // ~0.5MB

type CachePayload<T> = {
  timestamp: number;
  data: T;
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let lastPayload: string | null = null;

/**
 * Salva cache de forma assíncrona, não-bloqueante e debounced.
 * Usa requestIdleCallback para não interferir na UI.
 * Previne dupla serialização e race condition.
 */
export function saveFastCache<T>(data: T) {
  if (typeof window === 'undefined') return;

  // Serializa uma única vez e verifica tamanho
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_SIZE_BYTES) {
    console.warn('[FastCache] payload muito grande, ignorando');
    return;
  }

  // Guarda o payload mais recente
  lastPayload = serialized;

  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    // Reconstrói o objeto com timestamp, evitando dupla serialização
    const payloadObj = {
      timestamp: Date.now(),
      data: JSON.parse(lastPayload!)
    };
    const finalPayload = JSON.stringify(payloadObj);

    requestIdleCallbackSafe(() => {
      try {
        localStorage.setItem(KEY, finalPayload);
      } catch (e) {
        console.warn('[FastCache] falha ao salvar', e);
      }
    });
  }, 250);
}

/**
 * Recupera cache, respeitando TTL e ambiente.
 */
export function getFastCache<T>(): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: CachePayload<T> = JSON.parse(raw);

    // Invalida se expirou
    if (Date.now() - parsed.timestamp > TTL) {
      localStorage.removeItem(KEY);
      return null;
    }

    return parsed.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Limpa cache manualmente.
 */
export function clearFastCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Fallback seguro para requestIdleCallback, com tipagem correta.
 */
function requestIdleCallbackSafe(fn: () => void) {
  if (typeof window === 'undefined') {
    setTimeout(fn, 0);
    return;
  }

  // Verifica se requestIdleCallback existe e é uma função
  if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(fn, { timeout: 1000 });
  } else {
    setTimeout(fn, 0);
  }
}