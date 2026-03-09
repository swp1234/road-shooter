const CACHE_NAME = 'road-shooter-v3';
const ASSETS = [
  '/road-shooter/',
  '/road-shooter/index.html',
  '/road-shooter/css/style.css',
  '/road-shooter/js/app.js',
  '/road-shooter/js/achievements.js',
  '/road-shooter/js/scenes/achieve.js',
  '/road-shooter/js/i18n.js',
  '/road-shooter/js/locales/ko.json',
  '/road-shooter/js/locales/en.json',
  '/road-shooter/js/locales/ja.json',
  '/road-shooter/js/locales/zh.json',
  '/road-shooter/js/locales/hi.json',
  '/road-shooter/js/locales/ru.json',
  '/road-shooter/js/locales/es.json',
  '/road-shooter/js/locales/pt.json',
  '/road-shooter/js/locales/id.json',
  '/road-shooter/js/locales/tr.json',
  '/road-shooter/js/locales/de.json',
  '/road-shooter/js/locales/fr.json',
  '/road-shooter/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
