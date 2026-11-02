const V = 'coumsa-v3';
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Only handle this site's own files. Google Drive, fonts and the upload script go straight to the network.
  if (u.origin !== self.location.origin) return;
  
  // Pages: always try the network first so updates show up, fall back to the saved copy offline.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put('/', copy));
        return res;
      }).catch(() => caches.match('/'))
    );
    return;
  }
  
  // Everything else on the site: serve the saved copy, refresh it in the background.
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r).then(res => {
        if (res.ok) { const copy = res.clone();
          caches.open(V).then(c => c.put(r, copy)) }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});