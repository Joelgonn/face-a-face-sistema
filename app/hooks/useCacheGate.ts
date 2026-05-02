'use client';

import { useRef, useCallback } from 'react';

type Resolver = {
  id: number;
  resolve: () => void;
};

export function useCacheGate() {
  // controla execuções de preload (anti-race)
  const runIdRef = useRef(0);

  // fila de resolvers aguardando cache
  const resolversRef = useRef<Resolver[]>([]);

  // estado do cache (não reativo de propósito)
  const cacheReadyRef = useRef(false);

  // ============================================================
  // 🚀 INICIAR NOVO CICLO DE PRELOAD
  // ============================================================
  const startPreload = useCallback(() => {
    const id = ++runIdRef.current;

    // invalida cache atual
    cacheReadyRef.current = false;

    // ⚠️ cancela resolvers antigos (execuções anteriores)
    resolversRef.current = resolversRef.current.filter((r) => {
      if (r.id !== id) {
        r.resolve(); // libera quem estava esperando ciclo antigo
        return false;
      }
      return true;
    });

    return id;
  }, []);

  // ============================================================
  // ✅ MARCAR CACHE COMO PRONTO
  // ============================================================
  const markCacheReady = useCallback((id: number) => {
    // só aceita se for execução atual
    if (id !== runIdRef.current) return;

    cacheReadyRef.current = true;

    // resolve apenas quem pertence a esse ciclo
    resolversRef.current = resolversRef.current.filter((r) => {
      if (r.id === id) {
        r.resolve();
        return false;
      }
      return true;
    });
  }, []);

  // ============================================================
  // ⏳ AGUARDAR CACHE (COM TIMEOUT DE SEGURANÇA)
  // ============================================================
  const waitForCache = useCallback(async () => {
    if (cacheReadyRef.current) return;

    const currentId = runIdRef.current;

    await Promise.race([
      new Promise<void>((resolve) => {
        resolversRef.current.push({
          id: currentId,
          resolve,
        });
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('[CACHE] timeout de segurança acionado');
          resolve();
        }, 8000);
      }),
    ]);
  }, []);

  // ============================================================
  // 🧹 CLEANUP (IMPORTANTE)
  // ============================================================
  const cleanup = useCallback(() => {
    resolversRef.current.forEach((r) => r.resolve());
    resolversRef.current = [];
  }, []);

  return {
    startPreload,
    markCacheReady,
    waitForCache,
    cleanup,
  };
}