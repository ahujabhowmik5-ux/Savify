const CACHE_NAME = 'savify-v3';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ══════════════════════════════════════════════════════════════
// Push Notification Handlers
// ══════════════════════════════════════════════════════════════
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'Savify', body: event.data.text() };
    }
    
    const options = {
        body: data.body || 'A pool started near you!',
        icon: '/logos/savify_icon.png',
        badge: '/logos/savify_icon.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'open', title: 'Join Pool' },
            { action: 'dismiss', title: 'Later' }
        ],
        tag: 'savify-pool-' + (data.data?.pool_id || Date.now()),
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Savify', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
