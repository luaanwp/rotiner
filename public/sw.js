/**
 * Service worker do Rotiner — PWA instalável + shell offline.
 *
 * Estratégia enxuta e segura:
 *  - Navegações (HTML): network-first, cai pro index.html cacheado offline.
 *  - Assets same-origin (JS/CSS/img com hash do Vite): cache-first.
 *  - NUNCA intercepta origem externa (Supabase/CDN) — deixa passar direto,
 *    pra não cachear dados de API nem quebrar auth/realtime.
 */
const CACHE = 'rotiner-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase/CDN passam direto

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        }),
    ),
  )
})
