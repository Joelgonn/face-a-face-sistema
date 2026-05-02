// middleware.ts

import { type NextRequest, NextResponse } from 'next/server'
import { safeGetSession, isNetworkError } from '@/app/lib/server-safe-supabase'

// 🔥 FIX: Edge Runtime warning - middleware roda no Edge por padrão
// Não precisa de export const runtime = 'nodejs' aqui porque middleware já é Edge
// Mas se quiser forçar Node.js (recomendado para Supabase), use:
// export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // 🔥 Safe getSession - não quebra offline
    const { session, isOffline, error } = await safeGetSession();
    const user = session?.user;

    // Se estiver offline, NÃO bloqueia o dashboard
    if (isOffline) {
      // Log silencioso em produção, debug em desenvolvimento
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Middleware] Offline detectado, permitindo acesso');
      }
      
      // Apenas redireciona / → /dashboard se já tiver sessão local
      if (user && request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      
      return supabaseResponse;
    }

    // Se houve erro de autenticação (não é offline), loga mas não bloqueia
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Middleware] Erro de autenticação:', error.message);
      }
      // Não bloqueia - deixa a página decidir o fallback
    }

    // Online: proteção normal
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (user && request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse

  } catch (error) {
    // 🔥 Erro inesperado (ex: falha crítica)
    if (isNetworkError(error)) {
      // Erro de rede - trata como offline
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Middleware] Erro de rede, permitindo acesso como offline');
      }
      return supabaseResponse;
    }
    
    // Erro real - log e permite acesso (fallback seguro)
    console.error('[Middleware] Erro inesperado:', error);
    return supabaseResponse;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}