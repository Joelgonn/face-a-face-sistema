import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export function createClient() {
  // --- VALIDAÇÃO DE CONFIGURAÇÃO (FAIL FAST) ---
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[SUPABASE SERVER] ERRO CRÍTICO: Variáveis de ambiente não configuradas')
    throw new Error('[SUPABASE] Variáveis de ambiente NÃO configuradas. Verifique o .env.local')
  }

  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (err) {
            console.error('[SUPABASE SERVER] Erro ao setar cookies:', err)
          }
        },
      },
    }
  )
}