'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { precacheRoute } from '@/app/lib/offlineRepository';

export function PrefetchLinks() {
  const router = useRouter();
  const hasPrefetchedStatic = useRef(false);

  useEffect(() => {
    if (hasPrefetchedStatic.current) return;
    hasPrefetchedStatic.current = true;

    const routesToPrefetch = ['/dashboard', '/dashboard/medicamentos', '/dashboard/relatorio'];

    const timer = window.setTimeout(() => {
      routesToPrefetch.forEach((route) => {
        router.prefetch(route);
        void precacheRoute(route);
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
