'use server';

import { createClient } from '@/app/utils/supabase/server'; // Cliente para checar quem está logado
import { createClient as createAdminClient } from '@supabase/supabase-js'; // Cliente Admin para executar a ação
import { revalidatePath } from 'next/cache';

// Cliente com superpoderes (Service Role) - SÓ PARA EXECUÇÃO
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

// Função auxiliar de segurança
async function verificarPermissaoAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    throw new Error("Acesso negado. Você não tem permissão de administrador.");
  }
  return user;
}

export async function listarUsuarios() {
  // Permitimos listar, mas vamos verificar logado
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return users;
}

export async function excluirUsuario(targetUserId: string) {
  try {
    const adminUser = await verificarPermissaoAdmin();

    // TRAVA DE SEGURANÇA: Admin não pode se auto-excluir
    if (targetUserId === adminUser.id) {
      return { success: false, message: 'Você não pode excluir o administrador principal.' };
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
      return { success: false, message: 'Você não pode bloquear o administrador principal.' };
    }

    const duracao = deveBloquear ? '876000h' : 'none'; // 100 anos ou nada

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