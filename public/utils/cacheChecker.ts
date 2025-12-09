export class CacheChecker {
    static async isProfileCached(userId: string): Promise<boolean> {
        // Проверяем поддержку Cache API
        if (!('caches' in window)) {
            console.log('⚠️ Cache API не поддерживается браузером');
            return false;
        }
        
        try {
            // Получаем текущий origin (домен)
            const origin = window.location.origin;
            // Формируем полный URL
            const apiUrl = `${origin}/api/profile?id=${userId}`;
            
            console.log(`🔍 Проверяем кэш для: ${apiUrl}`);
            
            // Открываем кэш Service Worker
            const cache = await caches.open('mindleak-cache-v1');
            
            // Ищем в кэше
            const cachedResponse = await cache.match(apiUrl);
            
            if (cachedResponse) {
                console.log(`Профиль ${userId} найден в кэше`);
                return true;
            }
            
            console.log(` Профиль ${userId} не найден в кэше`);
            return false;
            
        } catch (error) {
            console.warn('Ошибка проверки кэша:', error);
            return false; // При ошибке считаем что НЕ доступно
        }
    }
}