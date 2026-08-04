// Load PWA service worker: app-shell caching for offline use in the gym.
// Strategy:
//   - precache the core shell on install
//   - navigation requests: network-first, falling back to the cached shell
//   - static assets (hashed build files): cache-first (they are immutable)
//   - Supabase API/auth calls: never cached, always go to the network
const VERSION = 'load-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`

const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/LoadLogo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept Supabase requests; they must always hit the network.
  if (url.hostname.includes('supabase') || url.hostname.endsWith('supabase.co')) return

  // App navigations: try the network first, fall back to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match('/index.html'))),
    )
    return
  }

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  // Other same-origin GETs: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => hit)
      return hit || network
    }),
  )
})
