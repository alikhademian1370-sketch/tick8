// ═══════════════════════════════════════════════
//  تیک‌۸ — Service Worker
//  نسخه cache رو هر بار که آپدیت می‌دی عوض کن
//  مثلاً: CACHE_NAME = 'tick8-v1.0.1'
// ═══════════════════════════════════════════════
const CACHE_NAME = 'tick8-v1.0.0';

// فایل‌هایی که باید cache بشن برای آفلاین
const CACHE_FILES = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap',
];

// ─── نصب ───
self.addEventListener('install', event => {
  // منتظر نمون — همین الان فعال شو
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // فونت رو جداگانه cache می‌کنیم چون ممکنه fail بشه
      return cache.addAll([
        './index.html',
        './manifest.json',
      ]).then(() => {
        // فونت با no-cors
        return fetch('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap', {mode:'no-cors'})
          .then(r => cache.put('vazirmatn-font', r))
          .catch(() => {}); // اگه offline بود skip کن
      });
    })
  );
});

// ─── فعال‌سازی (حذف cache قدیمی) ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] حذف cache قدیمی:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── fetch — استراتژی: Network First برای HTML، Cache First برای بقیه ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // درخواست‌های API و سرور رو cache نکن
  if(url.pathname.startsWith('/api/') || url.pathname.includes('version.json')){
    event.respondWith(fetch(event.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // فایل HTML اصلی — Network First (همیشه آخرین نسخه)
  if(event.request.url.includes('index.html') || event.request.url.endsWith('/')){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // نسخه جدید رو cache کن
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // offline — از cache برگردون
          return caches.match(event.request).then(r => r || caches.match('./index.html'));
        })
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
