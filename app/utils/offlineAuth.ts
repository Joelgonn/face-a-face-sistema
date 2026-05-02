// app/utils/offlineAuth.ts

// ============================================================
// 🔥 CHAVES PARA ARMAZENAMENTO
// ============================================================
export const LAST_USER_KEY = 'faceaface_last_user';
export const LAST_USER_ID_KEY = 'faceaface_last_user_id';
export const LAST_LOGIN_KEY = 'faceaface_last_login';
export const USER_SIGNATURE_KEY = 'faceaface_user_signature';
export const TOKEN_EXPIRY_KEY = 'faceaface_token_expiry';

// ============================================================
// 🔥 CONSTANTES DE SEGURANÇA E TEMPO
// ============================================================
// NOTA: Isso NÃO é um segredo real, é apenas obfuscação para evitar manipulação casual via DevTools
// Para proteção real, a validação está no backend (server actions)
// 🔥 FIX 3: DECISÃO CONSCIENTE - mantido como obfuscação estática
const SECRET_KEY = 'faceaface_offline_secret_2024';

// Tempo de expiração: 7 dias
export const OFFLINE_AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Limite máximo do cache de hash (n ≤ 100, O(n) é aceitável)
const MAX_HASH_CACHE_SIZE = 100;

// ============================================================
// 🔥 CACHE DE HASH (com invalidação FIFO e cache key robusta)
// ============================================================
const hashCache = new Map<string, string>();
const hashCacheOrder: string[] = [];

function getCacheKey(value: string): string {
  return `${value}:${SECRET_KEY}`;
}

function addToCache(value: string, signature: string): void {
  const cacheKey = getCacheKey(value);
  
  const existingIndex = hashCacheOrder.indexOf(cacheKey);
  if (existingIndex !== -1) {
    hashCacheOrder.splice(existingIndex, 1);
  }
  
  if (hashCacheOrder.length >= MAX_HASH_CACHE_SIZE) {
    const oldestKey = hashCacheOrder.shift();
    if (oldestKey) {
      hashCache.delete(oldestKey);
    }
  }
  
  hashCache.set(cacheKey, signature);
  hashCacheOrder.push(cacheKey);
}

function getFromCache(value: string): string | undefined {
  const cacheKey = getCacheKey(value);
  return hashCache.get(cacheKey);
}

// ============================================================
// 🔥 FUNÇÃO DE HASH (com cache FIFO e cache key robusta)
// ============================================================
export async function createSignature(value: string): Promise<string> {
  const cached = getFromCache(value);
  if (cached) {
    return cached;
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(value + SECRET_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  addToCache(value, signature);
  
  return signature;
}

// ============================================================
// 🔥 VALIDAÇÃO DE ASSINATURA
// ============================================================
export async function isValidUserSignature(email: string, storedSignature: string | null): Promise<boolean> {
  if (!storedSignature) return false;
  const expectedSignature = await createSignature(email);
  return expectedSignature === storedSignature;
}

// ============================================================
// 🔥 FUNÇÕES SEGURAS PARA LOCALSTORAGE (com try/catch)
// ============================================================
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[offlineAuth] Failed to read from localStorage key "${key}":`, error);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[offlineAuth] Failed to write to localStorage key "${key}":`, error);
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[offlineAuth] Failed to remove localStorage key "${key}":`, error);
  }
}

// ============================================================
// 🔥 LIMPEZA DE DADOS (LOGOUT) - COM ROLLBACK
// ============================================================
export function clearLastUser(): void {
  safeRemoveItem(LAST_USER_KEY);
  safeRemoveItem(LAST_USER_ID_KEY);
  safeRemoveItem(LAST_LOGIN_KEY);
  safeRemoveItem(USER_SIGNATURE_KEY);
  safeRemoveItem(TOKEN_EXPIRY_KEY);
}

// ============================================================
// 🔥 SALVAR ÚLTIMO USUÁRIO - COM ROLLBACK TRANSACIONAL
// ============================================================
export async function saveLastUser(email: string, userId: string, expiresAt: number): Promise<boolean> {
  const signature = await createSignature(email);
  
  // 🔥 FIX 1: Salvar todos os valores primeiro (para verificar consistência)
  const results = [
    safeSetItem(LAST_USER_KEY, email),
    safeSetItem(LAST_USER_ID_KEY, userId),
    safeSetItem(LAST_LOGIN_KEY, Date.now().toString()),
    safeSetItem(USER_SIGNATURE_KEY, signature),
    safeSetItem(TOKEN_EXPIRY_KEY, expiresAt.toString()),
  ];
  
  // Verificar se todos salvaram com sucesso
  const allSuccess = results.every(result => result === true);
  
  if (!allSuccess) {
    // 🔥 ROLLBACK: Limpar dados parcialmente salvos
    console.error('[offlineAuth] Failed to save user data, performing rollback...');
    clearLastUser();
    return false;
  }
  
  return true;
}

// ============================================================
// 🔥 FUNÇÃO SEGURA PARA PARSE DE NÚMEROS
// ============================================================
function safeParseNumber(value: string | null, fallback: number = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

// ============================================================
// 🔥 VALIDAR E OBTER ÚLTIMO USUÁRIO
// ============================================================
export async function getValidLastUser(): Promise<{ email: string; userId: string } | null> {
  const lastUser = safeGetItem(LAST_USER_KEY);
  const lastUserId = safeGetItem(LAST_USER_ID_KEY);
  const lastLogin = safeGetItem(LAST_LOGIN_KEY);
  const storedSignature = safeGetItem(USER_SIGNATURE_KEY);
  const tokenExpiry = safeGetItem(TOKEN_EXPIRY_KEY);
  
  if (!lastUser || !lastUserId || !storedSignature) return null;
  
  const lastLoginTime = safeParseNumber(lastLogin, 0);
  const tokenExpiryTime = safeParseNumber(tokenExpiry, 0);
  
  const isWithinExpiry = (Date.now() - lastLoginTime) < OFFLINE_AUTH_TTL_MS;
  const isTokenValid = tokenExpiryTime === 0 || Date.now() < tokenExpiryTime;
  const isValidSignature = await isValidUserSignature(lastUser, storedSignature);
  
  // Todas as condições devem ser satisfeitas
  if (isValidSignature && isWithinExpiry && isTokenValid) {
    return { email: lastUser, userId: lastUserId };
  }
  
  // Logs para diagnóstico
  if (!isValidSignature) console.warn('[offlineAuth] Invalid signature');
  if (!isWithinExpiry) console.warn('[offlineAuth] TTL expired');
  if (!isTokenValid) console.warn('[offlineAuth] Token expired');
  
  return null;
}

// ============================================================
// 🔥 OBTER ÚLTIMO USUÁRIO (SEM VALIDAÇÃO - APENAS LEITURA)
// ============================================================
// ⚠️ ATENÇÃO: Esta função retorna dados brutos do localStorage
// ⚠️ NÃO usar para autenticação - usar getValidLastUser() para validação real
// ⚠️ Esta função é útil apenas para UI (ex: mostrar "Bem-vindo de volta, X" antes de validar)
export function getLastUserStored(): { email: string | null; userId: string | null } {
  return {
    email: safeGetItem(LAST_USER_KEY),
    userId: safeGetItem(LAST_USER_ID_KEY),
  };
}

// ============================================================
// 🔥 FUNÇÃO PARA VERIFICAR SE HÁ SESSÃO VÁLIDA (RÁPIDA, SEM ASYNC)
// ============================================================
// NOTA: Esta função é síncrona e não valida assinatura
// Serve apenas para check rápido de UI (ex: mostrar badge)
export function hasStoredSession(): boolean {
  return !!safeGetItem(LAST_USER_KEY) && !!safeGetItem(USER_SIGNATURE_KEY);
}

// ============================================================
// 🔥 LIMPAR CACHE DE HASH (útil para testes ou logout extremo)
// ============================================================
export function clearHashCache(): void {
  hashCache.clear();
  hashCacheOrder.length = 0;
}

// ============================================================
// 🔥 RECUPERAR DADOS PARCIAIS (útil para diagnóstico)
// ============================================================
export function getStorageStatus(): { 
  hasUser: boolean; 
  hasUserId: boolean; 
  hasSignature: boolean;
  allPresent: boolean;
} {
  const hasUser = !!safeGetItem(LAST_USER_KEY);
  const hasUserId = !!safeGetItem(LAST_USER_ID_KEY);
  const hasSignature = !!safeGetItem(USER_SIGNATURE_KEY);
  
  return {
    hasUser,
    hasUserId,
    hasSignature,
    allPresent: hasUser && hasUserId && hasSignature,
  };
}