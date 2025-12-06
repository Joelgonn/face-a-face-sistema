'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin (Service Role) - Tem poder total para apagar tudo
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
  // 1. Valida a senha contra a variável de ambiente (Backend)
  if (senhaDigitada !== process.env.SYSTEM_RESET_PASSWORD) {
    return { 
      success: false, 
      message: 'Senha administrativa incorreta. Ação negada.' 
    };
  }

  try {
    // 2. Apaga os dados na ordem correta (para evitar erro de chave estrangeira)
    
    // Primeiro: Histórico de Adminstração
    const { error: errHist } = await supabaseAdmin
      .from('historico_administracao')
      .delete()
      .gt('id', 0); // Apaga tudo onde ID > 0
    if (errHist) throw errHist;

    // Segundo: Prescrições
    const { error: errPresc } = await supabaseAdmin
      .from('prescricoes')
      .delete()
      .gt('id', 0);
    if (errPresc) throw errPresc;

    // Terceiro: Encontristas
    const { error: errEncont } = await supabaseAdmin
      .from('encontristas')
      .delete()
      .gt('id', 0);
    if (errEncont) throw errEncont;

    // Revalida o cache do dashboard para atualizar a tela
    revalidatePath('/dashboard');
    
    return { success: true, message: 'Sistema zerado com sucesso.' };

  } catch (error) {
    return { success: false, message: 'Erro ao zerar banco: ' + (error as Error).message };
  }
}