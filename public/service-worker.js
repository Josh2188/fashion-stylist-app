// service-worker.js

// Cache version updated to ensure the new service worker activates
const CACHE_NAME = 'fashion-stylist-cache-v3'; 

// Core assets that are essential for the app shell to load.
// Caching only local assets during install is more reliable.
const CORE_ASSETS = [
  '/',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Install event: opens a cache and adds the core files to it.
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core app shell');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Delete all caches that are not the current one
        cacheNames.filter(cache => cache !== CACHE_NAME).map(cache => {
          console.log('Service Worker: Clearing old cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages
  );
});

// Fetch event: serves requests from the cache if available,
// otherwise fetches from the network and caches the result.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy: Stale-While-Revalidate
  // 1. Respond from cache immediately if available.
  // 2. In the background, fetch a fresh version from the network
  //    and update the cache for the next time.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, update the cache.
          // We don't cache Firestore API calls.
          if (networkResponse && networkResponse.status === 200 && !event.request.url.includes('firestore.googleapis.com')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response right away if it exists,
        // otherwise wait for the network response.
        return cachedResponse || fetchPromise;
      });
    })
  );
});
