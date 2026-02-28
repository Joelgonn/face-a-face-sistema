'use server';

import { createClient } from '@/app/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente com superpoderes (Service Role) - USADO APENAS PARA EXECUÇÃO
// Nunca exponha a SUPABASE_SERVICE_ROLE_KEY no frontend!
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// --- Função Auxiliar de Segurança (Blindagem) ---
// REFATORADO: Agora checa diretamente na tabela 'admins' do Supabase
async function verificarPermissaoAdmin() {
  // 1. Identifica quem está fazendo a requisição
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Verifica se o usuário está logado
  if (!user || !user.email) {
    throw new Error("Acesso negado. Usuário não autenticado.");
  }

  // 3. Consulta a tabela 'admins' para ver se o email dele está lá
  const { data: adminData, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', user.email)
    .single();

  // Se der erro ou não encontrar o dado, bloqueia a ação na hora!
  if (error || !adminData) {
    throw new Error("Acesso negado. Você não tem permissão de administrador.");
  }

  // Se passou, retorna o usuário para a ação ser executada
  return user;
}

// --- Actions do Servidor ---

export async function listarUsuarios() {
  // Apenas admins podem ver a lista completa
  await verificarPermissaoAdmin();

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) throw error;
  return users;
}

export async function excluirUsuario(targetUserId: string) {
  try {
    const adminUser = await verificarPermissaoAdmin();

    // TRAVA DE SEGURANÇA: Admin não pode se auto-excluir
    if (targetUserId === adminUser.id) {
      return { success: false, message: 'Você não pode excluir sua própria conta de administrador.' };
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    if (error) return { success: false, message: error.message };

    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Usuário removido com sucesso.' };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}

export async function alternarBloqueioUsuario(targetUserId: string, deveBloquear: boolean) {
  try {
    const adminUser = await verificarPermissaoAdmin();

    // TRAVA DE SEGURANÇA: Admin não pode se auto-bloquear
    if (targetUserId === adminUser.id) {
      return { success: false, message: 'Você não pode bloquear sua própria conta.' };
    }

    // Banimento de "100 anos" (876000 horas) ou 'none' para desbloquear
    const duracao = deveBloquear ? '876000h' : 'none';

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      ban_duration: duracao
    });

    if (error) return { success: false, message: error.message };

    revalidatePath('/dashboard/equipe');
    return { success: true, message: deveBloquear ? 'Acesso pausado.' : 'Acesso retomado.' };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
}