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
  // --- VALIDAÇÃO DE CONFIGURAÇÃO CRÍTICA ---
  if (!process.env.REGISTRATION_CODE) {
    console.error('[AUTH] ERRO CRÍTICO: REGISTRATION_CODE não configurada');
    return { 
      success: false, 
      message: 'Erro de configuração do sistema. Contate o administrador.' 
    };
  }

  // --- TRIM E VALIDAÇÃO DOS INPUTS ---
  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();
  const accessCode = (formData.get('accessCode') as string)?.trim();

  // 1. Validação de email
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { 
      success: false, 
      message: '❌ Email inválido. Digite um endereço de email válido.' 
    };
  }

  // 2. Validação de senha
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { 
      success: false, 
      message: '❌ Senha inválida. A senha deve ter pelo menos 6 caracteres.' 
    };
  }

  // 3. Validação do código de acesso
  if (!accessCode || accessCode !== process.env.REGISTRATION_CODE) {
    console.log('[AUTH] Tentativa inválida com código:', accessCode);
    return { 
      success: false, 
      message: '❌ Código de acesso incorreto. Tentativa bloqueada.' 
    };
  }

  // 4. Criação do usuário com tratamento de erro
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.error('[AUTH] Erro Supabase:', error);

      // Mensagens amigáveis para erros comuns (sem vazar detalhes técnicos)
      if (error.message.includes('already registered')) {
        return { 
          success: false, 
          message: '❌ Este email já está cadastrado no sistema.' 
        };
      }

      if (error.message.includes('password')) {
        return { 
          success: false, 
          message: '❌ Senha muito fraca. Use pelo menos 6 caracteres.' 
        };
      }

      // Para qualquer outro erro, mensagem genérica (não vaza detalhes)
      return { 
        success: false, 
        message: '❌ Erro ao cadastrar usuário. Tente novamente.' 
      };
    }

    console.log('[AUTH] Usuário cadastrado com sucesso:', { 
      email, 
      userId: data?.user?.id,
      data: new Date().toISOString()
    });

    return { 
      success: true, 
      message: '✅ Cadastro realizado com sucesso! Redirecionando...' 
    };

  } catch (err) {
    console.error('[AUTH] Erro inesperado no cadastro:', err);

    return { 
      success: false, 
      message: '❌ Erro interno ao cadastrar usuário. Tente novamente.' 
    };
  }
}