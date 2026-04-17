// Service Worker — Solução de Rua PWA
const CACHE_NAME = 'sdr-v27';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install: cache essential assets — skipWaiting força ativação imediata
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting();
});

// Activate: apaga TODOS os caches antigos (sdr-v1, etc.)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first strategy (always get latest from server, fallback to cache)
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Firebase API requests (always need fresh data)
    if (event.request.url.includes('firebaseio.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com/firebasejs')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache when offline
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Sem conexão</h2><p>O app precisa de internet para funcionar. Verifique sua conexão e tente novamente.</p></body></html>', {
                            headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        });
                    }
                    return new Response('', { status: 404 });
                });
            })
    );
});
