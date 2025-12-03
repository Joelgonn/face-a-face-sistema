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
async function verificarPermissaoAdmin() {
  // 1. Identifica quem está fazendo a requisição
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Carrega a lista de Admins permitidos
  // Remove espaços em branco caso alguém configure "email1, email2" com espaço
  const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim());

  // 3. Verifica se o usuário está logado e se o email dele está na lista
  if (!user || !user.email || !adminList.includes(user.email)) {
    throw new Error("Acesso negado. Você não tem permissão de administrador.");
  }

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