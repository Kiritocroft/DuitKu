// Duitku Service Worker v12
// HTML & config: network-first (always fresh, offline fallback).
// Assets & fonts: cache-first (offline-ready).

const CACHE_NAME = 'duitku-v12';
const APP_SHELL = [
  '/',
  '/index.html',
  '/config.js',
  '/wallet.js',
  '/vendor/supabase.min.js',
  '/fonts/fonts.css',
  '/fonts/JetBrainsMono-500-latin.woff2',
  '/fonts/JetBrainsMono-500-latin-ext.woff2',
  '/fonts/JetBrainsMono-600-latin.woff2',
  '/fonts/JetBrainsMono-600-latin-ext.woff2',
  '/fonts/JetBrainsMono-700-latin.woff2',
  '/fonts/JetBrainsMono-700-latin-ext.woff2',
  '/fonts/PlusJakartaSans-400-latin.woff2',
  '/fonts/PlusJakartaSans-400-latin-ext.woff2',
  '/fonts/PlusJakartaSans-500-latin.woff2',
  '/fonts/PlusJakartaSans-500-latin-ext.woff2',
  '/fonts/PlusJakartaSans-600-latin.woff2',
  '/fonts/PlusJakartaSans-600-latin-ext.woff2',
  '/fonts/PlusJakartaSans-700-latin.woff2',
  '/fonts/PlusJakartaSans-700-latin-ext.woff2',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
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

  // HTML & config: network-first so updates propagate immediately (offline fallback to cache)
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/config.js') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Local assets & fonts: cache-first
  if (isAppShell(url) || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/vendor/')) {
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