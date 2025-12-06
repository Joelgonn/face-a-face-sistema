'use server';

import { createClient } from '@supabase/supabase-js';

// Cliente Admin do Supabase
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

export async function cadastrarEnfermeiro(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const accessCode = formData.get('accessCode') as string;

  // 1. Verificação de Segurança
  if (accessCode !== process.env.REGISTRATION_CODE) {
    return { 
      success: false, 
      message: 'Código de acesso incorreto. Tentativa bloqueada.' 
    };
  }

  // 2. Cria o usuário no Supabase JÁ VALIDADO
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true // <--- ISSO É O IMPORTANTE: Libera o login na hora sem email
  });

  if (error) {
    return { success: false, message: error.message };
  }
  
  return { success: true, message: 'Cadastro realizado! Redirecionando...' };
}