// Service Worker for VIV Fitness PWA (100% Offline Support)
const CACHE_NAME = 'viv-core-v34';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/css/theme.css',
  '/app.js',
  '/storage.js',
  '/manifest.json',
  '/js/app.js',
  '/js/core/storage.js',
  '/js/core/theme.js',
  '/js/core/audio.js',
  '/js/components/modal.js',
  '/js/components/timer.js',
  '/js/components/chart.js',
  '/js/components/plate-calc.js',
  '/js/screens/habits.js',
  '/js/screens/workout.js',
  '/js/screens/stats.js',
  '/js/screens/profile.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core assets for 100% offline access');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Network First for fresh code on localhost, fallback to cache for offline
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
        })
    );
  }
});
