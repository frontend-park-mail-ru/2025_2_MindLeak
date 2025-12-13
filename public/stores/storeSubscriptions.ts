import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';

interface SubscriptionsState {
    subscriptions: string[]; // Массив ID пользователей, на которых подписан текущий пользователь
    isLoading: boolean;
    error: string | null;
}

class SubscriptionsStore extends BaseStore<SubscriptionsState> {
    constructor() {
        super({
            subscriptions: [],
            isLoading: false,
            error: null
        });
    }

    protected registerActions(): void {
        this.registerAction('SUBSCRIPTIONS_LOAD_REQUEST', () => {
            this.setState({ isLoading: true, error: null });
        });

        this.registerAction('SUBSCRIPTIONS_LOAD_SUCCESS', (payload: { users: any[] }) => {
            console.log('📥 [SubscriptionsStore] SUBSCRIPTIONS_LOAD_SUCCESS payload:', payload);
            
            // Извлекаем ID подписок из ответа
            const subscriptions = payload.users
                .map(user => {
                    console.log('👤 User object:', user);
                    
                    // Пробуем разные варианты полей ID
                    const id = user.id || user.Id || user.userId || user.ID;
                    console.log('🆔 Extracted ID:', id);
                    
                    return id ? id.toString() : null;
                })
                .filter(id => id !== null) as string[];
            
            console.log('💾 Saving subscription IDs:', subscriptions);
            
            this.setState({ 
                subscriptions, 
                isLoading: false, 
                error: null 
            });
            
            // Сразу проверим, подписан ли на тестового пользователя
            console.log('🔍 Check subscription for 90f53f63-5b71-455d-b822-f31216c7582f:', 
                this.isSubscribed('90f53f63-5b71-455d-b822-f31216c7582f'));
        });

        this.registerAction('SUBSCRIPTIONS_CLEAR', () => {
            this.setState({
                subscriptions: [],
                isLoading: false,
                error: null
            });
            console.log('🗑️ Subscriptions cleared');
        });

        this.registerAction('SUBSCRIPTIONS_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({ isLoading: false, error: payload.error });
        });

        // Подписка на пользователя
        this.registerAction('SUBSCRIBE_SUCCESS', (payload: { userId: string, targetProfileId?: string }) => {
            const userId = payload.userId.toString();
            if (!this.state.subscriptions.includes(userId)) {
                this.setState({
                    subscriptions: [...this.state.subscriptions, userId]
                });
            }
        });

        // Отписка от пользователя
        this.registerAction('UNSUBSCRIBE_SUCCESS', (payload: { userId: string, targetProfileId?: string }) => {
            const userId = payload.userId.toString();
            this.setState({
                subscriptions: this.state.subscriptions.filter(id => id !== userId)
            });
        });
    }

    // ✅ ДОБАВЬТЕ ЭТОТ МЕТОД
    isSubscribed(userId: string): boolean {
        return this.state.subscriptions.includes(userId.toString());
    }
}

export const subscriptionsStore = new SubscriptionsStore();