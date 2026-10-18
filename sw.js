/* Service Worker — офлайн-режим для МКС: Таймер смены + счётчик */
const CACHE = 'mks-timer-v4';   // ← меняй при обновлении файлов (v2, v3...)
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

/* Install: кэшируем по одному — падение одного файла не сломает весь install */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache =>
            Promise.all(
                ASSETS.map(url =>
                    cache.add(url).catch(err => console.warn('Не закэшировано:', url, err))
                )
            )
        ).then(() => self.skipWaiting())
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

/* Fetch: stale-while-revalidate + fallback на index.html для SPA-роутинга */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;   // внешние домены (VK и т.п.) не трогаем

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