/** @type {import('next').NextConfig} */

import withPWA from 'next-pwa';

const nextConfig = {
  // Permite servir arquivos estáticos da pasta public com headers corretos
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/offline',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// 🔥 CONFIGURAÇÃO CORRIGIDA DO PWA
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  
  runtimeCaching: [
    {
      // Rotas dinâmicas de paciente
      urlPattern: ({ url }) => url.pathname.startsWith('/dashboard/encontrista/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dashboard-patient-pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      // Demais páginas do dashboard
      urlPattern: ({ url }) => url.pathname.startsWith('/dashboard'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'dashboard-pages',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache para navegação geral
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache para dados estáticos
      urlPattern: /\.(?:css|js|mjs|json)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache para imagens
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache para API
      urlPattern: /^\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 1 * 24 * 60 * 60,
        },
      },
    },
  ],
  
  // 🔥 Pré-cache das rotas estáticas
  additionalManifestEntries: [
    { url: '/', revision: Date.now().toString() },
    { url: '/dashboard', revision: Date.now().toString() },
    { url: '/dashboard/encontristas', revision: Date.now().toString() },
    { url: '/offline', revision: Date.now().toString() },
  ],
  
  fallbacks: {
    document: '/offline',
  },
});

export default pwaConfig(nextConfig);
