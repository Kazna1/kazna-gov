/* =====================================================================
   Казна — Service Worker
   - Cache-first для статики (CSS/JS/шрифтов/иконок)
   - Stale-while-revalidate для статей блога
   - Network-first для главной + динамики
   - Offline fallback страница
   ===================================================================== */

const VERSION = 'kg-v1.0.0-2026-04-29';
const STATIC_CACHE = 'kg-static-' + VERSION;
const RUNTIME_CACHE = 'kg-runtime-' + VERSION;
const ARTICLES_CACHE = 'kg-articles-' + VERSION;

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE && k !== ARTICLES_CACHE)
            .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const isAsset = (url) => /\.(css|js|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|avif|ico)(\?.*)?$/i.test(url.pathname);
const isArticle = (url) => /^\/blog\//.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(url.host)) return;

  // Cache-first для assets
  if (isAsset(url) || /fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Stale-while-revalidate для статей блога
  if (isArticle(url)) {
    event.respondWith(
      caches.open(ARTICLES_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Network-first для всего остального с offline fallback
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() =>
      caches.match(req).then((cached) => cached || caches.match('/offline.html'))
    )
  );
});

// Web Push (placeholder — настроить VAPID ключи на бэке)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = (() => { try { return event.data.json(); } catch (e) { return { title: 'Казна', body: event.data.text() }; }})();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Казна', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'kazna',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Skip waiting from page
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
