// Service Worker for caching icons and other assets for offline use

const CACHE_NAME = 'tasker-assets-v1';
const ASSETS_TO_CACHE = [
  '/logo/tasker_logo.png',
  '/logo/logoleft.png',
  '/logo/logoright.png'
];

// Install event - cache the assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing and caching assets...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching assets:', ASSETS_TO_CACHE);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Assets cached successfully');
        self.skipWaiting(); // Activate the service worker immediately
      })
      .catch((error) => {
        console.error('Error caching assets:', error);
      })
  );
});

// Fetch event - serve cached assets when offline
self.addEventListener('fetch', (event) => {
  // Handle requests for cached assets
  if (event.request.url.includes('logo/')) {

    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version if available
          if (response) {
            console.log('Serving from cache:', event.request.url);
            return response;
          }

          // Otherwise fetch from network
          return fetch(event.request).catch(() => {
            // If network fails, try to return a fallback
            if (event.request.destination === 'image') {
              // Return a fallback SVG for images
              return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>', {
                headers: { 'Content-Type': 'image/svg+xml' }
              });
            } else {
              // For other resources, return an empty response
              return new Response('', { status: 200 });
            }
          });
        })
    );
  }
});