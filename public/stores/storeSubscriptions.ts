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
            // Извлекаем ID подписок из ответа
            const subscriptions = payload.users.map(user => user.id.toString());
            this.setState({ 
                subscriptions, 
                isLoading: false, 
                error: null 
            });
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