// Service worker BudgetGwen — cache hors ligne de la coquille.
// L app vit dans le localStorage de Gwen ; ici, on ne garde que la
// COQUILLE : page, actifs, icônes, manifest. Les données ne passent
// jamais par ici — elles restent dans le navigateur, et la sauvegarde
// JSON reste la vraie ceinture de sécurité.
//
// Version du cache : à incrémenter à chaque lot qui change la coquille
// (rituel de la maison) — les vieux caches sont purgés à l activation.
const CACHE = 'budgetgwen-shell-v1';

// La coquille de démarrage : la page, le manifest, les trois icônes.
const SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Coquille : réseau d abord (vivre à jour), cache en secours (vivre
// sans réseau). Actifs : réponse immédiate du cache, mise à jour
// discrète en arrière-plan — la fraîcheur arrive au prochain passage.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigation') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
