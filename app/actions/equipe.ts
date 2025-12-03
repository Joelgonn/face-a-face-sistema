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
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return users;
}

export async function excluirUsuario(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/equipe'); // Atualiza a lista na tela
  return { success: true, message: 'Usuário removido com sucesso.' };
}