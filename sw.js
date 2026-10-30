/* Service Worker — офлайн-режим + уведомление об обновлении
   Версия кэша: меняй при каждом релизе (v11 → v12 → ...) */
const CACHE = 'mks-timer-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

/* Install: кэшируем по одному — падение одного файла не сломает весь install.
   ❗ НЕ вызываем skipWaiting() — ждём команды от страницы. */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.all(
                ASSETS.map(url =>
                    cache.add(url).catch(err => console.warn('Не закэшировано:', url, err))
                )
            )
        )
    );
});

/* Activate: удаляем старые версии кэша */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

/* Message: страница просит активироваться по кнопке «Обновить» */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

/* Fetch: stale-while-revalidate + fallback на index.html для SPA-роутинга */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetched = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(event.request, copy));
                }
                return response;
            }).catch(() => cached || caches.match('./index.html'));
            return cached || fetched;
        })
    );
});