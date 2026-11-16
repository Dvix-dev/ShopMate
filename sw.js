const CACHE_NAME = 'shopmate-pwa-v4';
const APP_SHELL = [
  './',
  './index.html',
  './main.css',
  './app.js?v=3',
  './firebase-config.js',
  './firebase-config.example.js',
  './manifest.json',
  './assets/logo.png',
  './assets/icon.ico',
  './assets/app-icon.png'
];
const OFFLINE_SHELL_URL = new URL('./index.html', self.registration.scope).href;
const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('shopmate-pwa-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !CACHEABLE_EXTERNAL_HOSTS.has(url.hostname)) {
    // Never cache Firebase Auth, Realtime Database, or other API traffic.
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(OFFLINE_SHELL_URL, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(OFFLINE_SHELL_URL)) || Response.error())
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Cache Firebase's static SDK modules and web fonts after a successful
  // online load, then use those exact resources as an offline fallback.
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok || response.type === 'opaque') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || Response.error())
  );
});
