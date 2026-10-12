// =============================================================================
// VIV Fitness - Service Worker (Офлайн-режим PWA и кэширование ресурсов)
// =============================================================================
// Назначение: Обеспечивает полную автономную работу приложения без интернета,
// стратегию Network-First с возвратом к кэшу и бесшовное фоновое обновление.
// =============================================================================

// БЛОК 1. Идентификатор версии кэша и реестр критических ресурсов
const CACHE_NAME = 'viv-core-v38';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/css/theme.css',
  '/manifest.json',
  '/icon.svg',
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

// БЛОК 2. Событие установки (Pre-caching критических файлов)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Кэширование ресурсов VIV для автономной работы...');
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Ошибка предварительного кэширования файлов:', err);
      });
    })
  );
});

// БЛОК 3. Событие активации (Очистка старых версий кэша)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Удаление устаревшего кэша:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// БЛОК 4. Стратегия сетевых запросов (Network-First с Fallback в кэш)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

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
