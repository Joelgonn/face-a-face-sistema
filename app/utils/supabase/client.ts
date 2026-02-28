import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase' // <--- Importe isso!

export function createClient() {
  // Adicione <Database> logo após createBrowserClient
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}