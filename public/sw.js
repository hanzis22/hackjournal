const CACHE_NAME = 'hackjournal-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  '/next.svg',
  '/globe.svg',
  '/window.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests and skip internal Next.js dev hot-reloads
  if (e.request.method !== 'GET' || e.request.url.includes('_next') || e.request.url.includes('webpack')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Cache valid responses
        if (response && response.status === 200) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseCopy);
          });
        }
        return response;
      }).catch(() => {
        // Fallback for offline API request or navigate
        if (e.request.mode === 'navigate') {
          return caches.match('/dashboard');
        }
      });
    })
  );
});
