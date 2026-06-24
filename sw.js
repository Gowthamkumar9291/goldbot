// GoldBot Service Worker v1.0
const CACHE = 'goldbot-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for API calls, cache first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network for OANDA API
  if (url.hostname.includes('oanda.com') || url.hostname.includes('fxtrade') || url.hostname.includes('fxpractice')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network first, fallback to cache for everything else
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications (for trade signals)
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'GoldBot', body: 'New signal!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-72.svg',
      vibrate: [200, 100, 200],
      tag: 'goldbot-signal',
      renotify: true,
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
