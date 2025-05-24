/**
 * Advanced Service Worker for Enhanced CVD Risk Toolkit
 * @file /service-worker.js
 * @description Manages caching for offline use, PWA features, and resource fetching.
 * @version 1.2.1
 */

'use strict';

// --- Configuration ---
const CACHE_VERSION = 'cvd-toolkit-v1.2.1'; // Increment to force update on SW activation
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = 'offline.html';

// Assets to pre-cache immediately on install
// IMPORTANT: Adjust these paths to match YOUR final project structure!
const PRECACHE_ASSETS = [
    '/', // Cache the root (usually index.html)
    '/index.html',
    '/offline.html',
    '/styles.css',
    '/manifest.json', // Your PWA manifest
    // Core Utilities
    '/js/utils/error-detection-system.js',
    '/js/utils/form-handler.js',
    '/js/utils/runtime-protection.js',
    '/js/utils/device-capability-detector.js',
    '/js/utils/module-loader.js',
    '/js/utils/validation-helpers.js',
    '/js/utils/tab-manager.js',
    '/js/utils/loading-manager.js',
    '/js/utils/event-bus.js', // Make sure EventBus is here if loaded early
    '/js/utils/cross-tab-sync-module.js',
    // Data Modules
    '/js/data/clinical-thresholds.js',
    '/js/data/medication-database.js',
    // Core App Logic
    '/js/main.js',
    '/js/ui.js',
    // Calculation Modules
    '/js/calculations/framingham-algorithm.js',
    '/js/calculations/qrisk3-algorithm.js',
    '/js/calculations/risk-calculator.js',
    '/js/calculations/enhanced-medication-module.js',
    // Visualization & Export
    '/js/visualization/risk-visualization-module.js', // Adjust if path differs
    '/js/export/pdf-generator.js', // Adjust if path differs
    '/js/export/chart-exporter.js', // Adjust if path differs
    // Add any crucial images/icons/fonts if needed
    // '/assets/icons/icon-192x192.png',
];

// --- Helper Functions ---

/** Logs messages with a service worker prefix. */
const log = (message, ...args) => console.log('[Service Worker]', message, ...args);

/** Limits the number of entries in a dynamic cache. */
const limitCacheSize = (cacheName, maxItems) => {
    caches.open(cacheName).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > maxItems) {
                cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
            }
        });
    });
};

// --- Event Listeners ---

/**
 * Install Event: Pre-caches essential static assets.
 */
self.addEventListener('install', event => {
    log('Install Event - Precaching assets...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                // Use { cache: 'reload' } to bypass browser cache during SW install
                const cachePromises = PRECACHE_ASSETS.map(url =>
                    cache.add(new Request(url, { cache: 'reload' }))
                         .catch(err => log(`Failed to cache ${url}:`, err))
                );
                return Promise.all(cachePromises);
            })
            .then(() => {
                log('Precaching complete. Forcing activation...');
                return self.skipWaiting(); // Activate new SW immediately
            })
            .catch(err => log('Precaching failed:', err))
    );
});

/**
 * Activate Event: Cleans up old caches and claims clients.
 */
self.addEventListener('activate', event => {
    log('Activate Event - Cleaning old caches...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
                        .map(name => {
                            log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                log('Activation complete. Claiming clients...');
                return self.clients.claim(); // Take control of existing pages
            })
    );
});

/**
 * Fetch Event: Intercepts network requests and applies caching strategies.
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Don't cache chrome-extension:// or non-http/https requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Don't cache POST requests or API/logging endpoints (adjust if needed)
    if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
         event.respondWith(fetch(request));
         return;
    }

    // Strategy 1: Cache First (for pre-cached static assets)
    // Check if the request URL is in our PRECACHE_ASSETS list
    if (PRECACHE_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                return cachedResponse || fetch(request).then(networkResponse => {
                    // If fetched, add to dynamic cache (as a fallback)
                    const clonedResponse = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.put(request, clonedResponse));
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Strategy 2: Network First (for HTML/dynamic content, fallback to cache/offline)
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // If successful, cache it and return
                    const clonedResponse = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.put(request, clonedResponse));
                    return networkResponse;
                })
                .catch(() =>
                    caches.match(request) // If network fails, try cache
                          .then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL)) // Fallback to offline page
                )
        );
        return;
    }

    // Strategy 3: Stale While Revalidate (for other assets - CSS, JS loaded dynamically, etc.)
    // Good balance: serves fast from cache, updates in background.
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                const clonedResponse = networkResponse.clone();
                caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                    cache.put(request, clonedResponse);
                    limitCacheSize(DYNAMIC_CACHE_NAME, 50); // Keep dynamic cache tidy
                });
                return networkResponse;
            });
            // Return cached version if available, otherwise wait for network
            // The fetchPromise runs regardless, updating the cache.
            return cachedResponse || fetchPromise;
        }).catch(() => {
            // If both cache and network fail (especially for images),
            // you could return a placeholder image/SVG here if needed.
            log(`Failed to fetch/cache: ${request.url}`);
            // Only return offline page for navigation requests (handled above).
            // For other assets, failing might be acceptable.
        })
    );
});

/**
 * Message Event: Allows communication from the client.
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        log('Received SKIP_WAITING message, forcing activation.');
        self.skipWaiting();
    }
     if (event.data && event.data.type === 'CLEAR_CACHE') {
        log('Received CLEAR_CACHE message, deleting all caches.');
        event.waitUntil(
             caches.keys().then(cacheNames => {
                return Promise.all(cacheNames.map(cache => caches.delete(cache)));
             }).then(() => log('All caches cleared.'))
        );
    }
});