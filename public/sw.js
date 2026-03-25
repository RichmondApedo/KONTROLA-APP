// Minimal Service Worker to satisfy PWA "Install" requirements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler (required for Chromium install prompt)
  event.respondWith(fetch(event.request));
});
