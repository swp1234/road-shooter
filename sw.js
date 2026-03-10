const CACHE_NAME = 'road-shooter-v5-launch';
const ASSETS = [
  './',
  './index.html',
  './privacy-policy.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './og-image.svg',
  './vendor/three-r128.min.js',
  './css/style.css',
  './js/shared/launch-config.js',
  './js/shared/haptic.js',
  './js/shared/game-ads.js',
  './js/config.js',
  './js/save.js',
  './js/skins.js',
  './js/ranking.js',
  './js/achievements.js',
  './js/daily.js',
  './js/i18n.js',
  './js/app.js',
  './js/entities/boss.js',
  './js/entities/bullet.js',
  './js/entities/character.js',
  './js/entities/enemy.js',
  './js/entities/gate.js',
  './js/entities/item.js',
  './js/entities/squad.js',
  './js/scenes/achieve.js',
  './js/scenes/endless.js',
  './js/scenes/menu.js',
  './js/scenes/rank.js',
  './js/scenes/result.js',
  './js/scenes/run.js',
  './js/scenes/skin.js',
  './js/scenes/upgrade.js',
  './js/systems/combat.js',
  './js/systems/particle.js',
  './js/systems/road.js',
  './js/systems/sound.js',
  './js/three/renderer3d.js',
  './js/locales/ko.json',
  './js/locales/en.json',
  './js/locales/zh.json',
  './js/locales/hi.json',
  './js/locales/ru.json',
  './js/locales/ja.json',
  './js/locales/es.json',
  './js/locales/pt.json',
  './js/locales/id.json',
  './js/locales/tr.json',
  './js/locales/de.json',
  './js/locales/fr.json'
];

function toScopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map(toScopeUrl)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const fallback = await caches.match(toScopeUrl('./index.html'));
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
