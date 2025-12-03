'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cria um cliente com permissões de ADMIN (Service Role)
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

export async function listarUsuarios() {
  // A lista de usuários já retorna o campo 'banned_until'
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return users;
}

export async function excluirUsuario(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/equipe');
  return { success: true, message: 'Usuário removido com sucesso.' };
}

// NOVA FUNÇÃO: Pausar/Retomar
export async function alternarBloqueioUsuario(userId: string, deveBloquear: boolean) {
  // Se deve bloquear, banimos por 100 anos ('876000h'). Se não, ban_duration é 'none'.
  const duracao = deveBloquear ? '876000h' : 'none';

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: duracao
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/equipe');
  return { success: true, message: deveBloquear ? 'Acesso pausado.' : 'Acesso retomado.' };
}