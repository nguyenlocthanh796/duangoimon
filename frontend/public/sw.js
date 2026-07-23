// ─── Service Worker — POSA Frontend ────────────────────────────
// Strategies:
//   - Cache First: fonts, images, CSS (static assets)
//   - Network First: API responses
//   - Stale-while-revalidate: JS bundles (fast load + background update)
// ────────────────────────────────────────────────────────────────

const CACHE = {
  static: 'posa-static-v1',
  fonts: 'posa-fonts-v1',
  images: 'posa-images-v1',
  api: 'posa-api-v1',
  bundle: 'posa-bundle-v3',
};

const STATIC_ASSETS = [
  '/',
  '/fonts/BeVietnamPro_400Regular.ttf',
  '/fonts/BeVietnamPro_500Medium.ttf',
  '/fonts/BeVietnamPro_600SemiBold.ttf',
  '/fonts/BeVietnamPro_700Bold.ttf',
  '/fonts/MaterialCommunityIcons.ttf',
];

// ─── Install: pre-cache static assets ───────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = Object.values(CACHE);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// ─── Helper: is API request ───────────────────────────────────
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

// ─── Helper: is bundle request ────────────────────────────────
function isBundleRequest(url) {
  return (
    url.pathname.includes('.bundle') ||
    url.pathname.includes('/_expo/') ||
    url.pathname.endsWith('.js')
  );
}

// ─── Helper: is font request ──────────────────────────────────
function isFontRequest(url) {
  return url.pathname.startsWith('/fonts/') || url.pathname.endsWith('.ttf');
}

// ─── Helper: is image request ─────────────────────────────────
function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);
}

// ─── Fetch: routing ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and extensionless
  if (event.request.method !== 'GET') return;

  // === API: Network First, fallback to cache ===
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, CACHE.api));
    return;
  }

  // === Fonts: Cache First ===
  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(event.request, CACHE.fonts));
    return;
  }

  // === Images: Cache First ===
  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(event.request, CACHE.images));
    return;
  }

  // === JS Bundles: Stale-while-revalidate ===
  if (isBundleRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE.bundle));
    return;
  }

  // === Navigation / everything else: Network First ===
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request, CACHE.static));
  }
});

// ─── Cache First ────────────────────────────────────────────────
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
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// ─── Network First ──────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

// ─── Stale-while-revalidate ────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}
