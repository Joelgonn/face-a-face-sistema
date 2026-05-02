'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let removeMessageListener: (() => void) | undefined;

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update();

        const handleMessage = (event: MessageEvent) => {
          console.log('[SW] Mensagem recebida:', event.data);
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);
        removeMessageListener = () => {
          navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
      })
      .catch((error) => {
        console.error('[SW] Erro no Service Worker:', error);
      });

    const handleControllerChange = () => {
      console.log('[SW] Controller mudou');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      removeMessageListener?.();
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
