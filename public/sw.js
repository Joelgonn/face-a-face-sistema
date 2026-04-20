const STATIC_CACHE = 'face-static-v1'
const DYNAMIC_CACHE = 'face-dynamic-v1'
const OFFLINE_URL = '/offline.html'
const OFFLINE_IMAGE = '/offline-image.png'
const MAX_CACHE_ITEMS = 50
const NETWORK_TIMEOUT = 3000

// Arquivos estáticos (precache)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/offline-image.png',
  '/favicon.ico'
]

// --- FUNÇÃO PARA VERIFICAR SE É HTML VÁLIDO ---
function isValidHtmlResponse(response) {
  if (!response || !response.ok) return false
  const contentType = response.headers.get('content-type')
  return contentType?.includes('text/html') ?? false
}

// --- FUNÇÃO PARA LIMITAR TAMANHO DO CACHE ---
async function limitCache(cacheName) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  while (keys.length > MAX_CACHE_ITEMS) {
    await cache.delete(keys[0])
    keys.shift()
  }
}

// --- INSTALAÇÃO COM TRATAMENTO DE ERRO INDIVIDUAL ---
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...')
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      
      await Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => 
            console.warn('[SW] Falha ao cachear:', url, err)
          )
        )
      )
      
      console.log('[SW] Cache estático concluído')
      await self.skipWaiting()
    })()
  )
})

// --- ATIVAÇÃO ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...')
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
      await self.clients.claim()
    })()
  )
})

// --- FETCH COM ABORTCONTROLLER E FALLBACK ROBUSTO ---
self.addEventListener('fetch', (event) => {
  // Só processa requisições da própria origem
  if (!event.request.url.startsWith(self.location.origin)) return
  
  if (event.request.method !== 'GET') return
  
  // Ignora requisições do Supabase e analytics
  if (event.request.url.includes('/supabase')) return
  if (event.request.url.includes('google-analytics')) return
  
  // 🔥 Arquivos estáticos do Next.js (cache first com cache dinâmico)
  if (event.request.url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse
          
          return fetch(event.request).then(response => {
            if (response && response.ok) {
              const clone = response.clone()
              caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone))
            }
            return response
          })
        })
    )
    return
  }
  
  // 🔥 Imagens (Cache First)
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse
          
          return fetch(event.request)
            .then(response => {
              if (response && response.ok) {
                const responseClone = response.clone()
                caches.open(DYNAMIC_CACHE).then(async cache => {
                  await cache.put(event.request, responseClone)
                  await limitCache(DYNAMIC_CACHE)
                })
              }
              return response
            })
            .catch(() => {
              return caches.match(OFFLINE_IMAGE)
            })
        })
    )
    return
  }
  
  // 🔥 Detecção de navegação mais precisa
  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept')?.includes('text/html') ?? false)
  
  if (isNavigation) {
    event.respondWith(
      (async () => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT)
        
        try {
          const response = await fetch(event.request, { signal: controller.signal })
          clearTimeout(timeoutId)
          
          // 🔥 Só cacheia HTML se for uma resposta válida (não cacheia erro 200 com conteúdo errado)
          if (response && response.ok && isValidHtmlResponse(response)) {
            const responseClone = response.clone()
            const cache = await caches.open(DYNAMIC_CACHE)
            await cache.put(event.request, responseClone)
            await limitCache(DYNAMIC_CACHE)
          }
          return response
        } catch (error) {
          clearTimeout(timeoutId)
          console.log('[SW] Falha na rede, buscando cache:', error)
          
          const cachedResponse = await caches.match(event.request, { ignoreSearch: true })
          if (cachedResponse) {
            return cachedResponse
          }
          
          return caches.match(OFFLINE_URL) || new Response('Você está offline. Conecte-se à internet.', { 
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain' }
          })
        }
      })()
    )
    return
  }
  
  // 🔥 Outros recursos: Cache First
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse
        
        return fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              const responseClone = response.clone()
              caches.open(DYNAMIC_CACHE).then(async cache => {
                await cache.put(event.request, responseClone)
                await limitCache(DYNAMIC_CACHE)
              })
            }
            return response
          })
          .catch(() => {
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Offline'
            })
          })
      })
  )
})

// --- SINCRONIZAÇÃO ---
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Sincronizando dados pendentes...')
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_DATA' })
  })
}