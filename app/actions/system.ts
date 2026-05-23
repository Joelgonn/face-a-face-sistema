'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// ============================================================
// 🔥 CLIENTE ADMIN (SERVICE ROLE)
// ============================================================
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

// ============================================================
// 🔥 RESET COMPLETO DO SISTEMA
// ============================================================
export async function zerarSistemaCompleto(
  senhaDigitada: string
) {
  // ============================================================
  // 🔥 VALIDAÇÃO DE CONFIGURAÇÃO
  // ============================================================
  if (!process.env.SYSTEM_RESET_PASSWORD) {
    console.error(
      '[RESET] ERRO CRÍTICO: SYSTEM_RESET_PASSWORD não configurada'
    );

    return {
      success: false,
      message:
        'Erro de configuração do sistema. Contate o administrador.',
    };
  }

  // ============================================================
  // 🔥 VALIDAÇÃO DE SENHA
  // ============================================================
  if (
    senhaDigitada !== process.env.SYSTEM_RESET_PASSWORD
  ) {
    console.log('[RESET] Tentativa inválida', {
      data: new Date().toISOString(),
      sucesso: false,
      motivo: 'senha incorreta',
    });

    return {
      success: false,
      message:
        'Senha administrativa incorreta. Ação negada.',
    };
  }

  try {
    // ============================================================
    // 🔥 EXECUTA RESET SQL COMPLETO
    // ============================================================
    const { error: rpcError } =
      await supabaseAdmin.rpc(
        'zerar_banco_completo'
      );

    // ============================================================
    // 🔥 VALIDA ERRO RPC
    // ============================================================
    if (rpcError) {
      console.error(
        '[RESET] Falha RPC zerar_banco_completo',
        rpcError
      );

      throw new Error(
        `Falha ao executar reset completo: ${rpcError.message}`
      );
    }

    // ============================================================
    // 🔥 VALIDAÇÃO PÓS-RESET
    // ============================================================
    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from('encontristas')
      .select('*', {
        count: 'exact',
        head: true,
      });

    if (countError) {
      throw new Error(
        `Erro ao validar reset: ${countError.message}`
      );
    }

    if (count && count > 0) {
      throw new Error(
        `Reset falhou: ainda existem ${count} registros na tabela encontristas`
      );
    }

    // ============================================================
    // 🔥 LOG DE SUCESSO
    // ============================================================
    console.log('[RESET] Sistema zerado com sucesso', {
      data: new Date().toISOString(),
      sucesso: true,
      metodo: 'rpc_truncate_restart_identity',
    });

    // ============================================================
    // 🔥 REVALIDA DASHBOARD
    // ============================================================
    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        'Sistema zerado e IDs reiniciados com sucesso.',
    };
  } catch (error) {
    // ============================================================
    // 🔥 LOG DE ERRO
    // ============================================================
    console.error('[RESET] Falha na execução', {
      data: new Date().toISOString(),
      sucesso: false,
      erro: (error as Error).message,
    });

    return {
      success: false,
      message:
        'Erro ao zerar banco: ' +
        (error as Error).message,
    };
  }
}