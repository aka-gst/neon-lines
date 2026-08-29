// Offline shell for Neon Lines. Registered with a relative path so the scope
// stays on the /lines/ prefix the site serves the game under.
// Raise this name when an asset is dropped from the shell: refreshed files
// replace themselves, but entries for files that no longer ship only go away
// when the old cache is discarded on activate.
const CACHE = 'neon-lines-v7';
// Both games are served from this one origin and therefore share a single
// CacheStorage. The cleanup on activate must only ever touch this game's own
// caches: deleting everything else wipes the other game's offline copy.
const PREFIX = 'neon-lines-';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './android.css',
  './game.js',
  './favicon.svg',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  '/game-menu.css',
  '/player-name.js',
  './og.jpg',
  './icon-maskable-512.png',
  './balls/ball-red.png',
  './balls/ball-yellow.png',
  './balls/ball-green.png',
  './balls/ball-blue.png',
  './balls/ball-violet.png',
  './balls/ball-pink.png',
  './balls/ball-orange.png',
  './burst.png',
  './burst-g.webp',
  './burst-h.webp',
  './burst-i.webp'
];

// Assets are versioned by a ?v= query, so the cache is keyed by path alone.
// Keeping one entry per asset means a background refresh REPLACES it; keying by
// the full URL instead left the fresh copy beside the precached one, and an
// ignoreSearch lookup could go on preferring the stale entry indefinitely.
// The document is always network-first: its markup is bound to build-hashed
// asset URLs, so a cached copy paired with assets that no longer exist renders
// a broken, unstyled page. A programmatic fetch is not mode 'navigate', so the
// scope root is matched explicitly rather than trusting the mode alone.
const scopeRoot = new URL('./', self.location).href;

const cacheKey = request => {
  const url = new URL(request.url);
  url.search = '';
  return url.href;
};

const store = (request, response) => caches.open(CACHE)
  .then(cache => cache.put(cacheKey(request), response))
  // Range requests answer 206, which the Cache API refuses to store.
  .catch(() => undefined);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    // One entry at a time: addAll is atomic, so a single miss would leave the
    // whole install with nothing cached.
    .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => undefined))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Scores are worthless when stale, and analytics must never be replayed.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/pulse/')) return;

  if (request.mode === 'navigate' || cacheKey(request) === scopeRoot) {
    event.respondWith(fetch(request)
      .then(response => {
        if (response.status === 200) void store(request, response.clone());
        return response;
      })
      .catch(() => caches.match(scopeRoot)));
    return;
  }

  event.respondWith(caches.match(cacheKey(request)).then(hit => {
    const network = fetch(request).then(response => {
      if (response.status === 200) void store(request, response.clone());
      return response;
    }).catch(() => hit);
    return hit || network;
  }));
});
