'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function zerarSistemaCompleto(senhaDigitada: string) {
  // 1. Valida a senha contra a variável de ambiente
  if (senhaDigitada !== process.env.SYSTEM_RESET_PASSWORD) {
    return { 
      success: false, 
      message: 'Senha administrativa incorreta. Ação negada.' 
    };
  }

  try {
    // 2. Chama a função RPC do banco que criamos agora
    // Ela faz o TRUNCATE e reinicia os IDs para 1
    const { error } = await supabaseAdmin.rpc('zerar_banco_completo');

    if (error) throw error;

    // Revalida o cache do dashboard para atualizar a tela
    revalidatePath('/dashboard');
    
    return { success: true, message: 'Sistema zerado e IDs reiniciados com sucesso.' };

  } catch (error) {
    console.error(error);
    return { success: false, message: 'Erro ao zerar banco: ' + (error as Error).message };
  }
}