const CACHE_NAME = 'face-to-face-v1'
const OFFLINE_URL = '/offline.html'

// Arquivos para cache imediato
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando arquivos essenciais')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting())
  )
})

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Estratégia: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return
  
  // Ignora requisições para o Supabase (já tem seu próprio offline queue)
  if (event.request.url.includes('/supabase')) return
  
  // Ignora requisições de analytics
  if (event.request.url.includes('google-analytics')) return
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache da resposta (só se for bem-sucedida)
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback para cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse
            }
            
            // Se for navegação e não tiver cache, mostra página offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Offline'
            })
          })
      })
  )
})

// Sincronização em segundo plano (quando voltar online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Sincronizando dados pendentes...')
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  // Notifica os clientes abertos para sincronizarem
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_OFFLINE_DATA'
    })
  })
}