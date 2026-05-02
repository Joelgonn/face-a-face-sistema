import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { safeGetSession } from '@/app/lib/server-safe-supabase';
import { ErrorDisplay } from './ErrorDisplay';

export const runtime = 'nodejs';

export default async function DashboardPage() {

  // ============================================================
  // 🔥 1. AUTENTICAÇÃO (LEVE E SEGURA)
  // ============================================================
  const { session, isOffline: isOfflineAuth, error: authError } = await safeGetSession();
  const user = session?.user;

  // ============================================================
  // 🔥 2. OFFLINE → NÃO BLOQUEIA RENDER
  // ============================================================
  if (isOfflineAuth) {
    console.log('[DASHBOARD] Offline detectado (auth), render direto client');

    return (
      <DashboardClient
        initialEncontristas={[]}
        isAdminInitial={false}
      />
    );
  }

  // ============================================================
  // 🔥 3. SEM USUÁRIO → REDIRECT
  // ============================================================
  if (!user || !user.email) {
    redirect('/');
  }

  // ============================================================
  // 🔥 4. ERRO REAL DE AUTH
  // ============================================================
  if (authError) {
    console.error('[DASHBOARD] Erro de autenticação:', authError);

    return (
      <ErrorDisplay 
        title="Erro de autenticação"
        message="Não foi possível verificar sua permissão de acesso. Tente novamente."
      />
    );
  }

  // ============================================================
  // 🔥 5. RENDER DIRETO (SEM FETCH NO SERVER)
  // ============================================================
  return (
    <DashboardClient
      initialEncontristas={[]}
      isAdminInitial={false}
    />
  );
}