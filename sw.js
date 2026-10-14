// Duitku Service Worker v4
// Cache-first for app shell, network-first for config, stale-while-revalidate for others

const CACHE_NAME = 'duitku-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

function isAppShell(url) {
  return APP_SHELL.some(s => url.pathname === s || url.pathname === s + '/');
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Supabase API: always network-first, no caching
  if (url.hostname.endsWith('.supabase.co')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // App shell: cache-first
  if (isAppShell(url)) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Others: stale-while-revalidate
  e.respondWith(staleWhileRevalidate(e.request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const resp = await fetch(request);
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(resp => {
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}