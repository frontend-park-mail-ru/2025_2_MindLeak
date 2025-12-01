const CACHE_NAME = 'mindleak-cache-v1';
const urlsCache = ['/']; // Кэшируем только главную страницу

// Установка
self.addEventListener('install', (event) => {
    console.log('[SW] MindLeak SW installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching initial page');
                return cache.addAll(urlsCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Обработка всех запросов
self.addEventListener('fetch', (event) => {
    // Пропускаем только не-GET запросы
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        // Сначала пробуем сеть
        fetch(event.request)
            .then((networkResponse) => {
                // Если ответ успешный, клонируем и кэшируем
                if (networkResponse && networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            // Кэшируем ВСЕ успешные GET запросы
                            cache.put(event.request, responseToCache);
                        })
                        .catch(err => {
                            console.warn('[SW] Cache put error:', err);
                        });
                }
                
                return networkResponse;
            })
            .catch(() => {
                // Если сети нет, ищем в кэше
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('[SW] Serving from cache:', event.request.url);
                            return cachedResponse;
                        }
                        
                        // Если не нашли в кэше и это HTML запрос - показываем главную
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/');
                        }
                        
                        return new Response('Offline', { status: 408 });
                    });
            })
    );
});

// Очистка старых кэшей
self.addEventListener('activate', (event) => {
    const cacheWhiteList = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheWhiteList.indexOf(cacheName) === -1) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});
