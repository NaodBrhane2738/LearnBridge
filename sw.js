/**
 * LearnBridge — Inclusive Learning Service Worker
 * Version: learnbridge-v4
 *
 * Implements low-bandwidth caching strategy for Ethiopian learners:
 * - Cache-First for local application shell, Web Components, and typography
 * - Network-First with cache fallback for dynamic content
 * - Dedicated media cache for offline lesson bundles
 */

const CACHE_NAME = 'learnbridge-shell-v4';
const MEDIA_CACHE = 'learnbridge-media-v4';

const CORE_ASSETS = [
  './',
  './index.html',
  './player-lab.html',
  './styles.css',
  './app.js',
  './dist/learnbridge.js',
  './components/learnbridge-player.js',
  './components/learnbridge-transcript.js',
  './components/learnbridge-interpreter.js',
  './components/learnbridge-job-card.js',
  './components/learnbridge-certificate.js',
  './components/learnbridge-resource-list.js',
  './media/poster.jpg',
  './media/captions-en.vtt',
  './media/captions-am.vtt',
  './media/transcript.json',
  './assets/living-room-bg.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Core caching notice:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== MEDIA_CACHE).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // If requesting media (mp4, mp3, zip), handle through media cache
  if (url.pathname.endsWith('.mp4') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.zip')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          if (networkRes.ok && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(MEDIA_CACHE).then(cache => cache.put(req, copy));
          }
          return networkRes;
        }).catch(() => {
          // Provide informative fallback if media isn't cached
          return new Response('Media asset is not cached for offline playback.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Shell assets: Cache-first with network background revalidation
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes.ok && networkRes.status === 200 && url.origin === self.location.origin) {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return networkRes;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
      return cached || fetchPromise;
    })
  );
});
