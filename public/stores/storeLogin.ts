import { BaseStore } from './store';

export interface User {
    id: number;
    name: string;
    avatar: string;
    subtitle: string;
    email: string;
}

export interface LoginState {
    user: User | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    error: string | null;
}

class LoginStore extends BaseStore<LoginState> {
    constructor() {
        // Сначала вызываем super с начальным состоянием
        super({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: null
        });
        
        // Затем восстанавливаем состояние из localStorage
        this.restoreAuthState();
    }

    protected registerActions(): void {
        this.registerAction('USER_LOGIN_CHECKED', (payload: { user: User }) => {
            const newState = {
                user: {
                    ...payload.user,
                    email: payload.user.email || '' // ← Убедимся, что email есть
                },
                isLoggedIn: true,
                isLoading: false,
                error: null
            };
            this.setState(newState);
            this.saveAuthState(newState);
        });

        this.registerAction('USER_LOGIN_SUCCESS', (payload: { user: User }) => {
            const newState = {
                user: payload.user,
                isLoggedIn: true,
                isLoading: false,
                error: null
            };
            this.setState(newState);
            this.saveAuthState(newState);
        });

        this.registerAction('USER_LOGIN_FAIL', (payload: { error: string }) => {
            const newState = {
                user: null,
                isLoggedIn: false,
                isLoading: false,
                error: payload.error
            };
            this.setState(newState);
            this.clearAuthState();
        });

        this.registerAction('USER_LOGOUT', () => {
            const newState = {
                user: null,
                isLoggedIn: false,
                isLoading: false,
                error: null
            };
            this.setState(newState);
            this.clearAuthState();
        });

        this.registerAction('USER_UNAUTHORIZED', () => {
            const newState = {
                user: null,
                isLoggedIn: false,
                isLoading: false,
                error: 'Сессия истекла'
            };
            this.setState(newState);
            this.clearAuthState();
        });
    }

    private restoreAuthState(): void {
        try {
            const saved = localStorage.getItem('authState');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Проверяем, не устарели ли данные (например, больше суток)
                const savedTime = localStorage.getItem('authStateTime');
                if (savedTime) {
                    const timeDiff = Date.now() - parseInt(savedTime);
                    // Если прошло больше 24 часов, считаем данные устаревшими
                    if (timeDiff > 24 * 60 * 60 * 1000) {
                        this.clearAuthState();
                        return;
                    }
                }
                
                // Восстанавливаем состояние
                this.setState({
                    user: parsed.user,
                    isLoggedIn: parsed.isLoggedIn
                });
            }
        } catch (error) {
            console.error('Error loading auth state from localStorage:', error);
        }
    }

    private saveAuthState(state: LoginState): void {
        try {
            localStorage.setItem('authState', JSON.stringify({
                user: state.user,
                isLoggedIn: state.isLoggedIn
            }));
            localStorage.setItem('authStateTime', Date.now().toString());
        } catch (error) {
            console.error('Error saving auth state to localStorage:', error);
        }
    }

    private clearAuthState(): void {
        try {
            localStorage.removeItem('authState');
            localStorage.removeItem('authStateTime');
        } catch (error) {
            console.error('Error clearing auth state from localStorage:', error);
        }
    }
}

export const loginStore = new LoginStore();