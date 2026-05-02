// app/lib/server-safe-supabase.ts

export const runtime = 'nodejs';

import { createServerClient } from '@supabase/ssr';
import { type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { type Database } from '@/types/supabase';

// ============================================================
// 🔥 DETECÇÃO DE ERRO DE REDE (ROBUSTA)
// ============================================================
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && typeof error.cause === 'object' && error.cause !== null
    ? error.cause as { code?: string }
    : null;

  return (
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    cause?.code === 'ENOTFOUND' ||
    cause?.code === 'ECONNREFUSED'
  );
}

// ============================================================
// 🔥 TIMEOUT PARA EVITAR BLOQUEIO NO SERVER
// ============================================================
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );

  return Promise.race([promise, timeout]);
}

// ============================================================
// 🔥 RESULT TYPE
// ============================================================
export type SafeResult<T> = {
  data: T | null;
  error: Error | null;
  isOffline: boolean;
};

// ============================================================
// 🔥 WRAPPER SEGURO
// ============================================================
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T; error: Error | { message?: string } | string | null }>,
  shouldLogErrors: boolean = process.env.NODE_ENV !== 'production'
): Promise<SafeResult<T>> {

  try {
    const result = await withTimeout(queryFn(), 2000);

    if (result.error) {
      const errorObj = result.error instanceof Error
        ? result.error
        : new Error(typeof result.error === 'string' ? result.error : result.error.message || 'Erro no Supabase');

      if (shouldLogErrors) {
        console.error('[Supabase] Erro na query:', errorObj.message);
      }

      return {
        data: null,
        error: errorObj,
        isOffline: false,
      };
    }

    return {
      data: result.data,
      error: null,
      isOffline: false,
    };

  } catch (error) {

    if (
      isNetworkError(error) ||
      (error instanceof Error && error.message === 'TIMEOUT')
    ) {
      if (shouldLogErrors) {
        console.debug('[Supabase] Offline detectado (timeout/rede)');
      }

      return {
        data: null,
        error: null,
        isOffline: true,
      };
    }

    if (shouldLogErrors) {
      console.error('[Supabase] Erro inesperado:', error);
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      isOffline: false,
    };
  }
}

// ============================================================
// 🔥 CLIENT SERVER
// ============================================================
export function createSafeServerClient() {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            if (!isNetworkError(error) && process.env.NODE_ENV !== 'production') {
              console.warn('[Server] Falha ao setar cookies:', error);
            }
          }
        },
      },
    }
  );

  return supabase;
}

// ============================================================
// 🔥 AUTH (VERSÃO LOCAL-FIRST COM hasLocalSession)
// ============================================================

export async function safeGetSession() {
  const supabase = createSafeServerClient();

  // 🔥 1. tenta sessão local primeiro (não chama rede)
  try {
    const { data, error } = await supabase.auth.getSession();

    if (!error && data.session) {
      return {
        session: data.session,
        isOffline: true,
        error: null,
        hasLocalSession: true,
      };
    }
  } catch {
    // ignora
  }

  // 🔥 2. tenta validação online
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;

    return {
      session: data.user
        ? { user: data.user }
        : null,
      isOffline: false,
      error: null,
      hasLocalSession: false,
    };
  } catch (error) {

    if (isNetworkError(error)) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[AUTH] Offline → mantendo ausência de sessão');
      }
      return {
        session: null,
        isOffline: true,
        error: null,
        hasLocalSession: false,
      };
    }

    console.error('[AUTH] erro real:', error);

    return {
      session: null,
      isOffline: false,
      error: error instanceof Error ? error : new Error(String(error)),
      hasLocalSession: false,
    };
  }
}

// ============================================================
// 🔥 SEGURANÇA REAL (valida online)
// ============================================================
export async function safeGetUser() {
  const supabase = createSafeServerClient();

  const result = await safeSupabaseQuery<{ user: User | null }>(
    async () => {
      const { data, error } = await supabase.auth.getUser();
      return { data, error };
    }
  );

  return {
    user: result.data?.user ?? null,
    isOffline: result.isOffline,
    error: result.error,
  };
}