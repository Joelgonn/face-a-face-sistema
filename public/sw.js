const CACHE_NAME = 'face-to-face-v2' // ATUALIZEI A VERSÃO
const OFFLINE_URL = '/offline.html'

// 🔥 REMOVIDO '/dashboard' da lista de precache
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
]

// --- INSTALAÇÃO ---
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

// --- ATIVAÇÃO ---
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

// --- ESTRATÉGIA DE FETCH (Network First para navegação) ---
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') return
  
  // Ignora requisições para o Supabase
  if (event.request.url.includes('/supabase')) return
  
  // Ignora requisições de analytics
  if (event.request.url.includes('google-analytics')) return
  
  // Para navegação (HTML), usa Network First com fallback offline
  if (event.request.mode === 'navigate') {
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
          // Fallback para cache ou página offline
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse
              }
              return caches.match(OFFLINE_URL)
            })
        })
    )
    return
  }
  
  // Para outros recursos (CSS, JS, imagens), Cache First com fallback para rede
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }
        
        return fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Se for uma imagem, retorna um placeholder
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/favicon.ico')
            }
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Offline'
            })
          })
      })
  )
})

// --- SINCronização EM SEGUNDO PLANO ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Sincronizando dados pendentes...')
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_OFFLINE_DATA'
    })
  })
}