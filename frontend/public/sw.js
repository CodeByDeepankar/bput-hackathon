/* PWA Service Worker
  - Robust offline support for pages, assets, and API data
  - Next.js chunk handling to prevent chunk load errors
  - Request queue for offline POST/PUT/DELETE with background sync
*/
const VERSION = 'v9';
const APP_SHELL_CACHE = `glp-shell-${VERSION}`;
const STATIC_CACHE = `glp-static-${VERSION}`;
const DATA_CACHE = `glp-data-${VERSION}`;
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/offline.html',
  '/favicon.ico',
  // Fonts commonly used by the app
  '/fonts/KFOmCnqEu92Fr1Mu4mxK.woff2'
];

// IndexedDB helpers for storing JSON payloads (subjects, quizzes, streak etc.)
const DB_NAME = 'glp-offline';
const DB_VERSION = 2;
const STORE_JSON = 'json';
const STORE_QUEUE = 'queue';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_JSON)) db.createObjectStore(STORE_JSON);
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  try {
    const db = await idbOpen();
    const tx = db.transaction(STORE_JSON, 'readwrite');
    tx.objectStore(STORE_JSON).put(value, key);
    return tx.complete;
  } catch {}
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    const tx = db.transaction(STORE_JSON, 'readonly');
    return await new Promise((res, rej) => {
      const r = tx.objectStore(STORE_JSON).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  } catch { return null; }
}

// Queue helpers for offline write operations
async function idbQueueAdd(record) {
  try {
    const db = await idbOpen();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).add(record);
    return tx.complete;
  } catch {}
}

async function idbQueueGetAll() {
  try {
    const db = await idbOpen();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    return await new Promise((res, rej) => {
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  } catch { return []; }
}

async function idbQueueClear() {
  try {
    const db = await idbOpen();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).clear();
    return tx.complete;
  } catch {}
}

async function flushRequestQueue() {
  const queued = await idbQueueGetAll();
  if (!queued.length) return { flushed: 0 };
  let flushed = 0;
  for (const q of queued) {
    try {
      const { url, method, headers, body } = q;
      const res = await fetch(url, { method, headers, body });
      if (res && res.ok) flushed++;
      // Optionally cache any JSON response
      try {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.clone().json();
          idbPut(new URL(url).pathname, { data, ts: Date.now() });
        }
      } catch {}
    } catch (e) {
      // Stop on first failure to retry later
      break;
    }
  }
  // If all flushed successfully, clear queue
  if (flushed === queued.length) await idbQueueClear();
  // Notify clients
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  clientsList.forEach(c => c.postMessage({ type: 'queue-flushed', flushed }));
  return { flushed };
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(CORE_ASSETS);
      // Pre-cache key app routes for better offline experience
      try {
        const routes = [
          '/',
          '/student',
          '/student/challenges',
          '/student/achievements',
          '/student/courses',
          '/student/study-buddy',
          '/teacher',
          '/teacher/students',
          '/teacher/classes',
          '/teacher/reports',
          '/subjects',
          '/progress',
        ];
        await Promise.all(routes.map(r => cache.add(r)));
        console.log('[SW] Pre-cached app routes');
      } catch (e) {
        console.log('[SW] Could not pre-cache routes (server may be down)');
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
  await Promise.all(keys.filter(k => ![APP_SHELL_CACHE, STATIC_CACHE, DATA_CACHE].includes(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET
  const isGet = request.method === 'GET';

  const url = new URL(request.url);

  // Queue non-GET API requests when offline
  if (!isGet) {
    const isApi = url.pathname.startsWith('/api/') || url.origin.includes('localhost:4000');
    if (isApi) {
      event.respondWith((async () => {
        try {
          // Try network first
          return await fetch(request);
        } catch (e) {
          // Offline: queue the request
          const body = await request.clone().arrayBuffer().catch(() => null);
          const headers = {};
          request.headers.forEach((v, k) => headers[k] = v);
          await idbQueueAdd({ url: request.url, method: request.method, headers, body });
          // Attempt background sync
          if ('sync' in self.registration) {
            try { await self.registration.sync.register('api-sync'); } catch {}
          }
          return new Response(JSON.stringify({ queued: true, offline: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json', 'X-Queued': '1' }
          });
        }
      })());
      return;
    }
  }

  // Handle Next.js chunks - improved error handling and fallbacks
  if (url.pathname.startsWith('/_next/') && url.hostname === self.location.hostname) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          // Cache successful chunks for offline use
          if (res.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, res.clone());
          }
          return res;
        } catch (err) {
          console.log('[SW] Chunk fetch failed:', url.pathname);
          // Try cached version first
          const cached = await caches.match(request);
          if (cached) {
            console.log('[SW] Serving cached chunk:', url.pathname);
            return cached;
          }
          
          // For JS chunks, return a more robust fallback
          if (url.pathname.endsWith('.js')) {
            console.log('[SW] Creating JS fallback for:', url.pathname);
            const fallbackJS = `
              console.warn('Chunk unavailable offline: ${url.pathname}');
              // Export empty module to prevent import errors
              if (typeof module !== 'undefined' && module.exports) {
                module.exports = {};
              }
              if (typeof window !== 'undefined') {
                window.__CHUNK_LOAD_ERROR__ = true;
              }
            `;
            return new Response(fallbackJS, {
              headers: { 
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-cache'
              }
            });
          }
          
          // For CSS chunks
          if (url.pathname.endsWith('.css')) {
            console.log('[SW] Creating CSS fallback for:', url.pathname);
            return new Response('/* Offline: chunk styles unavailable */', {
              headers: { 
                'Content-Type': 'text/css',
                'Cache-Control': 'no-cache'
              }
            });
          }
          
          // For other assets, throw to trigger normal error handling
          throw err;
        }
      })()
    );
    return;
  }

  // API & data endpoints: network-first with fallback to cache / IndexedDB
  const isData = url.pathname.startsWith('/api/') || url.origin.includes('localhost:4000') || url.pathname.includes('/quiz') || url.pathname.includes('/streak') || url.pathname.startsWith('/subjects') || url.pathname.startsWith('/leaderboard');
  if (isData) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const clone = res.clone();
          const contentType = res.headers.get('content-type') || '';
          // Cache JSON separately and store payload in IndexedDB
          if (contentType.includes('application/json')) {
            try {
              const data = await clone.clone().json();
              idbPut(url.pathname + url.search, { data, ts: Date.now() });
            } catch {}
          }
          caches.open(DATA_CACHE).then(c => c.put(request, clone));
          // Notify clients for data updates
          const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
          clientsList.forEach(c => c.postMessage({ type: 'data-updated', key: url.pathname + url.search }));
          return res;
        } catch (err) {
          // Try cache
          const cached = await caches.match(request) || await caches.match(request, { cacheName: DATA_CACHE });
          if (cached) return cached;
          // Try IndexedDB JSON -> build synthetic response
          const stored = await idbGet(url.pathname + url.search);
          if (stored) {
            return new Response(JSON.stringify(stored.data), { headers: { 'Content-Type': 'application/json', 'X-Offline': '1' } });
          }
          throw err;
        }
      })()
    );
    return;
  }

  // Navigation requests: serve cached pages when offline
  if (request.mode === 'navigate') {
    // Allow auth-related routes to bypass entirely (Clerk, OAuth callbacks)
    if (url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up') || url.pathname.includes('oauth')) {
      return; // default browser fetch
    }
    event.respondWith((async () => {
      try {
        const res = await fetch(request, { cache: 'no-store' });
        // Cache successful HTML responses for offline access
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          const cache = await caches.open(APP_SHELL_CACHE);
          cache.put(request, res.clone());
        }
        return res;
      } catch (e) {
        console.warn('[SW] Navigation fetch failed, checking cache:', url.href);
        
        // First try: exact page match
        const exactMatch = await caches.match(request);
        if (exactMatch) {
          console.log('[SW] Serving cached page:', url.pathname);
          return exactMatch;
        }
        
        // Second try: try without query params for dynamic routes
        const urlWithoutQuery = new URL(url.pathname, url.origin);
        const pageMatch = await caches.match(urlWithoutQuery.href);
        if (pageMatch) {
          console.log('[SW] Serving cached page (no query):', url.pathname);
          return pageMatch;
        }
        
        // Third try: for app routes like /student, /teacher, try to serve the main shell
        if (url.pathname !== '/' && !url.pathname.startsWith('/api/')) {
          const shell = await caches.match('/');
          if (shell) {
            console.log('[SW] Serving app shell for:', url.pathname);
            return shell;
          }
        }
        
        // Last resort: offline page
        console.log('[SW] Serving offline page for:', url.pathname);
        return caches.match('/offline.html');
      }
    })());
    return;
  }

  // Static assets (images, css, js, fonts) – cache-first
  if (['image', 'style', 'font', 'script'].includes(request.destination) || /\.(png|jpg|jpeg|gif|webp|svg|css|js|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch (err) {
          // Return cached version or create fallback for common assets
          if (cached) return cached;
          // Fallback for missing images
          if (['image'].includes(request.destination) || /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname)) {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#ccc"><rect width="64" height="64" fill="#f0f0f0"/><text x="32" y="32" text-anchor="middle" dominant-baseline="middle" font-size="12">📚</text></svg>`,
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return cached;
        }
      })()
    );
    return;
  }
});

// Background sync for queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'api-sync') {
    event.waitUntil(flushRequestQueue());
  }
});

// Client message handler
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data === 'clear-offline-cache') {
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('glp-')).map(k => caches.delete(k))));
    return;
  }
  if (data.type === 'warm-cache' && Array.isArray(data.urls)) {
    const urls = data.urls;
    event.waitUntil(
      (async () => {
        const shell = await caches.open(APP_SHELL_CACHE);
        const staticCache = await caches.open(STATIC_CACHE);
        await Promise.all(urls.map(async (u) => {
          try {
            const res = await fetch(u, { cache: 'no-store' });
            if (res.ok) {
              const dest = (u.endsWith('.js') || u.endsWith('.css') || u.endsWith('.woff2')) ? staticCache : shell;
              dest.put(u, res.clone());
            }
          } catch {}
        }));
      })()
    );
    return;
  }
  if (data.type === 'flush-queue') {
    event.waitUntil(flushRequestQueue());
  }
});
