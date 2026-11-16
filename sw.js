/**
 * LearnBridge — Inclusive Learning Service Worker
 * Version: learnbridge-v4
 *
 * Implements low-bandwidth caching strategy for Ethiopian learners:
 * - Cache-First for local application shell, Web Components, and typography
 * - Network-First with cache fallback for dynamic content
 * - Dedicated media cache for offline lesson bundles
 */

const CACHE_NAME = 'learnbridge-shell-v5';
const MEDIA_CACHE = 'learnbridge-media-v5';

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './voice/stateMachine.js',
  './voice/languageCapabilities.js',
  './voice/commandRegistry.js',
  './voice/speechOutput.js',
  './voice/voiceBridge.js',
  './voice/voiceController.js',
  './offline/offlineStore.js',
  './offline/syncManager.js',
  './offline/offlineManager.js',
  './assets/login-hero.jpg',
  './assets/foundations-icon.png',
  './assets/guide-avatar.png',
  './assets/guide-face.png',
  './assets/lesson-poster.jpg',
  './assets/portfolio-banner.jpg',
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
