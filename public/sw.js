// 🟢 SETIAP KALI ADA PEMBARUAN LINK ATAU SOAL, GANTI V1 JADI V2, V3, DST.
const CACHE_NAME = 'cbt-sman19-offline-v5'; 

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/logo-sman19.svg',
  '/manifest.webmanifest'
];

// 1. Install Event: Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate / Network-First with Offline Cache Fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Vite internal development routes, HMR, and module requests
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('vite') ||
    url.pathname.includes('hot-update') ||
    url.search.includes('import') ||
    url.search.includes('html-proxy')
  ) {
    return;
  }

  // Skip API routes (/api/*), Firebase/Google APIs, or non-http protocols
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // Handle SPA Navigation requests (HTML page loads when offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html or root
          return caches.match('/index.html').then((cachedIndex) => {
            if (cachedIndex) return cachedIndex;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, Images, Fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          // Network failed, return cached response if available
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message Event: Custom cache commands from client & auto-update
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_ALL_ASSETS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls).then(() => {
        event.ports[0]?.postMessage({ status: 'success' });
      });
    });
  }
});
