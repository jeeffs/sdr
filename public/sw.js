// Service Worker — Solução de Rua PWA v30
// Estratégia: cache-first para assets estáticos, network-first para app shell
// Firebase RTDB usa WebSocket (não interceptável pelo SW) — offline tratado pelo keepSynced

const CACHE_NAME  = 'sdr-v31';
const CACHE_SHELL = 'sdr-shell-v30';

// Assets do app shell — carregados com cache-first após primeiro acesso
const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Assets de código — versionados pelo CACHE_NAME
const APP_ASSETS = [
    '/sdr-module.js',
    '/sdr-bundle.js'
];

// CDN assets pré-cacheados no install para uso offline imediato
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-regular-400.woff2',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// CDN assets — cache-first (não mudam sem versão na URL)
const CDN_ORIGINS = [
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.jsdelivr.net'
];

// ── Helpers: cacheia cada URL individualmente (tolerante a falhas por item) ────
async function cacheIndividual(cacheName, urls) {
    const cache = await caches.open(cacheName);
    const results = await Promise.allSettled(
        urls.map(url =>
            fetch(url, { cache: 'reload' })
                .then(res => {
                    if (res.ok) return cache.put(url, res);
                    console.warn('[SDR SW] skip (não-OK):', url, res.status);
                })
                .catch(err => console.warn('[SDR SW] skip (erro):', url, err.message))
        )
    );
    const ok  = results.filter(r => r.status === 'fulfilled').length;
    const nok = results.filter(r => r.status === 'rejected').length;
    console.log(`[SDR SW] ${cacheName}: ${ok} ok, ${nok} falha(s)`);
}

// ── Install: pré-cacheia shell imediatamente ──────────────────────────────────
self.addEventListener('install', event => {
    console.log('[SDR SW] install — v30');
    event.waitUntil(
        Promise.all([
            cacheIndividual(CACHE_SHELL, SHELL_ASSETS),
            cacheIndividual(CACHE_NAME,  APP_ASSETS),
            cacheIndividual(CACHE_NAME,  CDN_ASSETS)
        ]).then(() => {
            console.log('[SDR SW] pré-cache concluído — shell + app + CDN');
            return self.skipWaiting();
        })
    );
});

// ── Activate: remove caches antigos ──────────────────────────────────────────
self.addEventListener('activate', event => {
    const KEEP = [CACHE_NAME, CACHE_SHELL];
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => !KEEP.includes(k))
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // Firebase: nunca interceptar — usa WebSocket próprio
    if (url.includes('firebaseio.com') ||
        url.includes('firebaseapp.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com/firebasejs')) {
        return;
    }

    // CDN assets: cache-first (Font Awesome, Leaflet, xlsx, etc.)
    if (CDN_ORIGINS.some(o => url.includes(o))) {
        event.respondWith(cacheFirst(event.request, CACHE_NAME));
        return;
    }

    // App assets (sdr-module.js, sdr-bundle.js): cache-first — atualizados pelo versão do SW
    if (url.includes('sdr-module.js') || url.includes('sdr-bundle.js')) {
        event.respondWith(cacheFirst(event.request, CACHE_NAME));
        return;
    }

    // App shell (HTML, manifest, ícones): network-first com fallback para cache
    event.respondWith(networkFirst(event.request));
});

// ── Estratégia: network-first (HTML do app) ───────────────────────────────────
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_SHELL);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_) {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Página de fallback offline para navegação
        if (request.mode === 'navigate') {
            return new Response(offlinePage(), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }
        return new Response('', { status: 503 });
    }
}

// ── Estratégia: cache-first (assets estáticos) ────────────────────────────────
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_) {
        return new Response('', { status: 503 });
    }
}

// ── Página offline ────────────────────────────────────────────────────────────
function offlinePage() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sem conexão — Solução de Rua</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px 24px;
            max-width: 360px; width: 100%; text-align: center; }
    .icon { font-size: 3rem; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; font-size: 1.3rem; }
    p { color: #94a3b8; font-size: .9rem; margin: 0 0 24px; line-height: 1.5; }
    button { background: #2563eb; color: #fff; border: none; border-radius: 10px;
             padding: 12px 24px; font-size: 1rem; cursor: pointer; width: 100%; }
    button:active { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h2>Sem conexão</h2>
    <p>O app está offline. Verifique o Wi-Fi ou dados móveis e tente novamente.</p>
    <button onclick="location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`;
}
