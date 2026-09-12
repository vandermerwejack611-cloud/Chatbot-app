const CACHE_NAME = 'jaxxai-v2';
const ASSETS = [
  '/Chatbot-app/',
  '/Chatbot-app/index.html',
  '/Chatbot-app/icons/icon.svg',
  '/Chatbot-app/icons/maskable_icon.svg',
  '/Chatbot-app/icons/splash-portrait.svg',
  '/Chatbot-app/icons/splash-landscape.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => console.warn('Some assets failed to cache', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); return null; })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // navigation requests -> try network, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(res => {
        // optionally update cache
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return res;
      }).catch(() => caches.match('/Chatbot-app/index.html'))
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => null))
  );
});
