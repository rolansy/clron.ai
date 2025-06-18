// Add this file if you don't have it already

// Cache Google authentication resources
const CACHE_NAME = 'auth-cache-v1';
const urlsToCache = [
  'https://www.googleapis.com/identitytoolkit/v3/relyingparty/',
  'https://securetoken.googleapis.com/v1/token',
  'https://accounts.google.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Register the service worker in index.jsx
// filepath: d:\AI\clron.ai\frontend\src\index.jsx
// Add this at the bottom of your file
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js');
  });
}