'use client';

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  // --- VALIDAÇÃO DE CONFIGURAÇÃO (FAIL FAST) ---
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[SUPABASE CLIENT] ERRO CRÍTICO: Variáveis de ambiente não configuradas')
    throw new Error('[SUPABASE CLIENT] Variáveis de ambiente NÃO configuradas. Verifique o .env.local')
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}