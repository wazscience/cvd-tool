/* eslint-env serviceworker */
const CACHE_NAME = 'cvd-toolkit-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/combined.js',
  '/js/validation.js',
  '/js/calculations.js',
  '/js/medication.js',
  '/js/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
