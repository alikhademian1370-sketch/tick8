// ═══════════════════════════════════════════════
//  تیک‌۸ — Service Worker
//  هر بار آپدیت: فقط CACHE_NAME رو عوض کن
//  مثلاً: tick8-v1.0.1 → tick8-v1.0.2
// ═══════════════════════════════════════════════
const CACHE_NAME = 'tick8-v1.0.0';

const CORE_FILES = [
  './index.html',
  './manifest.json',
  './version.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ─── نصب ───
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES)
        .then(() => {
          return fetch('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap', {mode:'no-cors'})
            .then(r => cache.put('vazirmatn-font', r))
            .catch(() => {});
        });
    })
  );
});

// ─── فعال‌سازی ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] حذف cache قدیمی:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── fetch ─── Network First برای HTML و version.json، Cache First برای بقیه
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // version.json — همیشه از شبکه (تا آپدیت رو ببینه)
  if(url.pathname.includes('version.json')){
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML اصلی — Network First
  if(url.pathname.endsWith('/') || url.pathname.includes('index.html')){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // بقیه — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response.ok){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', {status: 408}));
    })
  );
});

// ─── پیام از صفحه ───
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
