'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      alert('Você ainda está offline. Conecte-se à internet.');
    }
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-4 border-orange-500">
        
        {/* Logo */}
        <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Image 
            src="/logo.png"
            alt="Logo"
            width={80}
            height={80}
            className="object-cover rounded-full"
          />
        </div>

        {/* Ícone de offline */}
        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Você está offline</h1>
        
        <p className="text-gray-600 mb-6">
          A página que você tentou acessar não está disponível offline.
          Conecte-se à internet para continuar.
        </p>

        {/* Indicador de reconexão */}
        {isOnline && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center gap-2 animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Conexão restabelecida! Recarregando...</span>
          </div>
        )}

        {/* Botões de ação */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isOnline}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>

          <button
            onClick={handleGoHome}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Ir para o Dashboard
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Face a Face - Igreja Batista Apascentar
        </p>
      </div>
    </div>
  );
}