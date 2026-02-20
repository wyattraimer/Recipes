const CACHE_VERSION = 'v2'
const CACHE_NAME = `recipe-collector-${CACHE_VERSION}`
const APP_SHELL = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(req)
          if (cached) {
            return cached
          }
          return caches.match('/offline.html')
        }),
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(req)
        .then((res) => {
          if (res && res.ok && req.method === 'GET') {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return res
        })
        .catch(() => {
          if (req.destination === 'image') {
            return new Response('', { status: 503, statusText: 'Offline' })
          }
          return undefined
        })
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
