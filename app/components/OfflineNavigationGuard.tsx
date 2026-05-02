'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// 🔥 Componente que registra rotas visitadas para possível cache futuro
export function OfflineNavigationGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.serviceWorker?.controller) {
      // Notifica o service worker sobre a rota visitada
      navigator.serviceWorker.controller.postMessage({
        type: 'NAVIGATION_VISITED',
        url: pathname,
        timestamp: Date.now(),
      });
    }
  }, [pathname]);

  return null;
}