import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';

//Интерфейс пользователя
export interface User {
    id: string;
    name: string;
    avatar: string;
    subtitle?: string;
}

//Интерфейс состояния аутентификации
export interface LoginState {
    isLoggedIn: boolean;
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

class LoginStore extends BaseStore<LoginState> {
    constructor() {
        // Передаем начальное состояние в родительский класс
        super({
            isLoggedIn: false,
            user: null,
            isLoading: false,
            error: null
        });
    }

    //Регистрирует обработчики actions
    protected registerActions(): void {
        // Исп вспомогат метод registerAction
        this.registerAction('LOGIN_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('USER_LOGIN_START', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('USER_LOGIN_SUCCESS', (payload: { user: User }) => {
            this.setState({
                isLoggedIn: true,
                user: payload.user,
                isLoading: false,
                error: null
            });
        });

        this.registerAction('USER_LOGIN_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoggedIn: false,
                user: null,
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('USER_LOGOUT', () => {
            this.setState({
                isLoggedIn: false,
                user: null,
                error: null
            });
        });

        this.registerAction('USER_LOGIN_CHECKED', (payload: { user: User | null }) => {
            this.setState({
                isLoggedIn: !!payload.user,
                user: payload.user,
                isLoading: false
            });
        });
    }
}

// Созд единственный экземпляр
export const loginStore = new LoginStore();