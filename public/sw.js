const CACHE_VERSION = 'v8'
const CACHE_NAME = `recipe-collector-${CACHE_VERSION}`
const withScope = (path = '') => new URL(path, self.registration.scope).toString()
const OFFLINE_URL = withScope('offline.html')
const APP_URL = withScope('')
const NAVIGATION_NETWORK_TIMEOUT_MS = 4000
const NAVIGATION_FRESH_TIMEOUT_MS = 1800
const APP_SHELL = [
  APP_URL,
  OFFLINE_URL,
  withScope('site.webmanifest'),
  withScope('favicon-32x32.png'),
  withScope('favicon-16x16.png'),
  withScope('apple-touch-icon.png'),
  withScope('android-chrome-192x192.png'),
  withScope('android-chrome-512x512.png'),
]

async function fetchWithTimeout(request, timeoutMs) {
  let timeoutId

  const response = await Promise.race([
    fetch(request),
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
    }),
  ])
    .then((res) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      return res
    })
    .catch(() => null)

  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const requestUrl = new URL(req.url)
  const isSameOrigin = requestUrl.origin === self.location.origin

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cachedPage = (await cache.match(req)) || (await cache.match(APP_URL))

        if (cachedPage) {
          const freshResponse = await fetchWithTimeout(req, NAVIGATION_FRESH_TIMEOUT_MS)
          if (freshResponse && freshResponse.ok) {
            event.waitUntil(cache.put(req, freshResponse.clone()))
            return freshResponse
          }

          event.waitUntil(
            fetch(req)
              .then((res) => {
                if (res && res.ok) {
                  return cache.put(req, res.clone())
                }
                return undefined
              })
              .catch(() => undefined),
          )

          return cachedPage
        }

        const networkResponse = await fetchWithTimeout(req, NAVIGATION_NETWORK_TIMEOUT_MS)

        if (networkResponse && networkResponse.ok) {
          event.waitUntil(cache.put(req, networkResponse.clone()))
          return networkResponse
        }

        return (
          (await cache.match(APP_URL)) ||
          (await cache.match(OFFLINE_URL)) ||
          new Response('Offline', { status: 503, statusText: 'Offline' })
        )
      })(),
    )
    return
  }

  if (
    req.method === 'GET' &&
    isSameOrigin &&
    ['style', 'script', 'font', 'image'].includes(req.destination)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req)

        if (cached) {
          event.waitUntil(
            fetch(req)
              .then((res) => {
                if (res && res.ok) {
                  return cache.put(req, res.clone())
                }
                return undefined
              })
              .catch(() => undefined),
          )
          return cached
        }

        return fetch(req)
          .then((res) => {
            if (res && res.ok) {
              event.waitUntil(cache.put(req, res.clone()))
            }
            return res
          })
          .catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))
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
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
