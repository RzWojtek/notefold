// sw.js — Service Worker dla NoteFold
// WAŻNE: Zmień numer wersji przy każdym deployu → automatyczne odświeżenie
const CACHE = 'notefold-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL — zapisz zasoby do cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Od razu przejmij kontrolę, nie czekaj na zamknięcie karty
  self.skipWaiting();
});

// ACTIVATE — usuń stare cache, przejmij wszystkich klientów
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — Network First dla HTML/JS/CSS, Cache First dla obrazków
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Pomijaj Firebase, Cloudinary, Google APIs
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('cloudinary') ||
      url.hostname.includes('gstatic')) return;

  // HTML, JS, CSS → Network First (zawsze świeże)
  const isAppFile = url.pathname.endsWith('.html') ||
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname === '/';

  if (isAppFile) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Zapisz świeżą wersję do cache
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request)) // fallback gdy offline
    );
    return;
  }

  // Obrazki → Cache First
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Nasłuchuj wiadomości od strony (np. "skipWaiting")
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
