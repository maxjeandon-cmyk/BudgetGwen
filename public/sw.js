// Service worker BudgetGwen — lot PWA.
// Volontairement MINIMAL : il déclare un handler fetch en transparence
// pour satisfaire les critères d installation, mais ne met rien en
// cache. L app vit dans le localStorage du navigateur ; une mise en
// cache agressive de l app shell sera une amélioration future, pas un
// besoin d aujourd hui. On ne construit pas un grenier avant la maison.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Transparence : chaque requête va au réseau, comme sans service worker.
// C est ici que vivra, un jour, la mise en cache hors ligne.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
