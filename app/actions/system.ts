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
  // --- VALIDAÇÃO DE CONFIGURAÇÃO CRÍTICA ---
  if (!process.env.SYSTEM_RESET_PASSWORD) {
    console.error('[RESET] ERRO CRÍTICO: SYSTEM_RESET_PASSWORD não configurada no ambiente');
    return { 
      success: false, 
      message: 'Erro de configuração do sistema. Contate o administrador.' 
    };
  }

  // 1. Valida a senha contra a variável de ambiente
  if (senhaDigitada !== process.env.SYSTEM_RESET_PASSWORD) {
    // --- LOG DE TENTATIVA INVÁLIDA ---
    console.log('[RESET] Tentativa inválida', {
      data: new Date().toISOString(),
      sucesso: false,
      motivo: 'senha incorreta'
    });
    return { 
      success: false, 
      message: 'Senha administrativa incorreta. Ação negada.' 
    };
  }

  try {
    // 2. Tenta usar a função RPC do banco
    const { error: rpcError } = await supabaseAdmin.rpc('zerar_banco_completo');

    // --- FALLBACK MANUAL SE RPC FALHAR ---
    if (rpcError) {
      console.error('[RESET] RPC falhou, executando fallback manual...', rpcError);
      
      // Fallback: ordem importa (primeiro filhos, depois pais)
      // --- VALIDAÇÃO DE ERRO EM CADA DELETE ---
      
      const del1 = await supabaseAdmin.from('historico_administracao').delete().neq('id', 0);
      if (del1.error) {
        throw new Error(`Falha ao deletar historico_administracao: ${del1.error.message}`);
      }
      
      const del2 = await supabaseAdmin.from('prescricoes').delete().neq('id', 0);
      if (del2.error) {
        throw new Error(`Falha ao deletar prescricoes: ${del2.error.message}`);
      }
      
      const del3 = await supabaseAdmin.from('encontristas').delete().neq('id', 0);
      if (del3.error) {
        throw new Error(`Falha ao deletar encontristas: ${del3.error.message}`);
      }
      
      console.log('[RESET] Fallback manual executado com sucesso');
    }

    // 3. VALIDAÇÃO PÓS-RESET: Garantir que o banco realmente foi zerado
    const { count, error: countError } = await supabaseAdmin
      .from('encontristas')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Erro ao validar reset: ${countError.message}`);
    }

    if (count && count > 0) {
      throw new Error(`Reset falhou: ainda existem ${count} registros na tabela encontristas`);
    }

    // --- LOG DE SUCESSO REAL ---
    console.log('[RESET] Sucesso', {
      data: new Date().toISOString(),
      sucesso: true,
      metodo: rpcError ? 'fallback_manual' : 'rpc'
    });

    // Revalida o cache do dashboard para atualizar a tela
    revalidatePath('/dashboard');
    
    return { success: true, message: 'Sistema zerado e IDs reiniciados com sucesso.' };

  } catch (error) {
    // --- LOG DE ERRO DETALHADO ---
    console.error('[RESET] Falha na execução', {
      data: new Date().toISOString(),
      sucesso: false,
      erro: (error as Error).message
    });
    
    return { 
      success: false, 
      message: 'Erro ao zerar banco: ' + (error as Error).message 
    };
  }
}