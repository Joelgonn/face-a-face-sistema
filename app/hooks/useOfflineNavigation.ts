'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { 
  toAbsoluteUrl
} from '@/app/lib/offlineCore';
import { hasRouteCache, precacheRoute } from '@/app/lib/offlineRepository';

export function useOfflineNavigation() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================================
  // 🔥 NAVEGAÇÃO CORRIGIDA (versão final - SEM window.location)
  // ============================================================
  const navigateTo = useCallback(async (url: string) => {
    const absoluteUrl = toAbsoluteUrl(url);

    // ✅ USA navigator.onLine DIRETO (não confia no state)
    if (navigator.onLine) {
      router.push(url);
      return;
    }

    // ✅ OFFLINE: verifica cache primeiro
    const cached = await hasRouteCache(absoluteUrl);

    if (cached) {
      console.log(`[Offline] Cache encontrado, navegando: ${url}`);
      // ✅ CORREÇÃO: usar router.push em vez de window.location.href
      router.push(url);
      return;
    }

    console.warn(`[Offline] Sem cache para: ${url}, tentando precache...`);

    // ✅ OFFLINE: tenta cachear a rota
    const success = await precacheRoute(absoluteUrl);

    if (success) {
      console.log(`[Offline] Precache bem-sucedido, navegando: ${url}`);
      // ✅ CORREÇÃO: usar router.push em vez de window.location.href
      router.push(url);
      return;
    }

    // ✅ FALLBACK: volta para página anterior se possível
    console.warn(`[Offline] Falha ao navegar para: ${url}, usando fallback`);

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/offline');
    }
  }, [router]);

  // ============================================================
  // 🔥 VOLTAR CORRIGIDO
  // ============================================================
  const goBack = useCallback(() => {
    if (navigator.onLine) {
      router.back();
    } else {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  // ============================================================
  // 🔥 PREFETCH CORRIGIDO (agora com URL absoluta)
  // ============================================================
  const prefetchAndCache = useCallback(async (url: string) => {
    try {
      // 🔥 CRÍTICO: converte para URL absoluta ANTES de cachear
      const absoluteUrl = toAbsoluteUrl(url);
      
      router.prefetch(url);
      await precacheRoute(absoluteUrl);
      
      console.log(`[Offline] Prefetch realizado: ${absoluteUrl}`);
    } catch (error) {
      console.warn(`[Offline] Falha no prefetch: ${url}`, error);
    }
  }, [router]);

  // ============================================================
  // 🔥 FUNÇÃO AUXILIAR: FORÇAR CACHE DE MÚLTIPLAS ROTAS
  // ============================================================
  const prefetchMultiple = useCallback(async (urls: string[]) => {
    try {
      const promises = urls.map(async (url) => {
        const absoluteUrl = toAbsoluteUrl(url);
        router.prefetch(url);
        await precacheRoute(absoluteUrl);
        console.log(`[Offline] Prefetch múltiplo: ${absoluteUrl}`);
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.warn('[Offline] Falha no prefetch múltiplo:', error);
    }
  }, [router]);

  // ============================================================
  // 🔥 FUNÇÃO AUXILIAR: VERIFICAR SE ROTA ESTÁ CACHEADA
  // ============================================================
  const isRouteCached = useCallback(async (url: string): Promise<boolean> => {
    const absoluteUrl = toAbsoluteUrl(url);
    return await hasRouteCache(absoluteUrl);
  }, []);

  return { 
    navigateTo, 
    goBack, 
    isOnline, 
    prefetchAndCache,
    prefetchMultiple,
    isRouteCached
  };
}