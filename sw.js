const CACHE_NAME = 'sicu1-ncds-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.html',
  '/style.css',
  '/main.js',
  '/main-dashboard.js',
  '/ncds-data.js',
  '/exercise-data.js',
  '/food-data.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/profile-default.png',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              // For external resources like Chart.js, we don't want to cache failed responses.
              if (event.request.url.startsWith('https://cdn.jsdelivr.net')) {
                return response;
              }
            }

            // Clone the response because it's also a stream.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 