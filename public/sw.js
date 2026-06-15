// Simple service worker for Karneval El Mahaba PWA installation support
const CACHE_NAME = 'karneval-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
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
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests and skip API calls to backend
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }
  
  // Network-first strategy to ensure real-time data is loaded
  e.respondWith(
    fetch(e.request).catch(async () => {
      const cachedResponse = await caches.match(e.request);
      if (cachedResponse) return cachedResponse;
      
      // If it's a navigation request and no cache, return index.html
      if (e.request.mode === 'navigate') {
        return caches.match('/');
      }
      
      // Otherwise return an empty 408 response to avoid 'Failed to convert value to Response' error
      return new Response('Offline', { status: 408, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});
