import { subscriptionsStore } from '../stores/storeSubscriptions';

export class SubscriptionHelper {
    private static loadingPromise: Promise<void> | null = null;
    private static currentListener: (() => void) | null = null;
    
    static async waitForSubscriptions(): Promise<void> {
        // Если уже есть промис - возвращаем его
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // Если уже загружены - сразу возвращаем
        if (!subscriptionsStore.getState().isLoading) {
            return Promise.resolve();
        }
        
        // Создаем новый промис
        this.loadingPromise = new Promise((resolve) => {
            // Создаем слушатель
            const listener = () => {
                if (!subscriptionsStore.getState().isLoading) {
                    // Удаляем слушатель
                    subscriptionsStore.removeListener(listener);
                    this.currentListener = null;
                    this.loadingPromise = null;
                    resolve();
                }
            };
            
            // Сохраняем ссылку на слушатель
            this.currentListener = listener;
            
            // Подписываемся
            subscriptionsStore.addListener(listener);
            
            // Проверяем сразу на случай быстрой загрузки
            listener();
        });
        
        return this.loadingPromise;
    }
 
    static async getSubscriptionFlag(userId: string): Promise<boolean> {
        // Сначала ждем загрузки
        await this.waitForSubscriptions();
        
        // Теперь безопасно проверяем
        return subscriptionsStore.isSubscribed(userId);
    }

    static reset(): void {
        // Удаляем слушатель если есть
        if (this.currentListener) {
            subscriptionsStore.removeListener(this.currentListener);
            this.currentListener = null;
        }
        
        this.loadingPromise = null;
    }
}