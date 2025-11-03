import { ajax } from '../modules/ajax';
import { dispatcher } from '../dispatcher/dispatcher';


const STATUS = {
    ok: 200,
    noMoreContent: 204,
    badRequest: 400,
    unauthorized: 401,
    notFound: 404,
    conflict: 409,
};

class API {
    handleAction(actionType: string, payload?: any): void {
        console.log(`API action: ${actionType}`, payload);

        switch (actionType) {
            case 'LOGIN_CHECK_REQUEST':
                this.checkAuth();
                break;
            case 'LOGIN_REQUEST':
                this.login(payload.email, payload.password);
                break;
            case 'LOGOUT_REQUEST':
                this.logout();
                break;
            case 'SIGNUP_REQUEST':
                this.signUp(payload.name, payload.email, payload.password);
                break;

            case 'POSTS_LOAD_REQUEST':
                this.loadPosts();
                break;
        }
    }

    // отправ действие через диспетчер
    private sendAction(actionType: string, payload?: any): void {
        dispatcher.dispatch(actionType, payload);
    }

    private async checkAuth(): Promise<void> {
        const response = await ajax.getMe();

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const userData = {
                        name: response.data.name,
                        avatar: response.data.avatar || '/img/defaultAvatar.jpg',
                        subtitle: response.data.subtitle || 'Блог'
                    };
                    this.sendAction('USER_LOGIN_CHECKED', { user: userData });
                } else {
                    this.sendAction('USER_LOGIN_FAIL', { error: 'No user data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_LOGIN_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('USER_LOGIN_FAIL', { error: response.message || 'Auth check failed' });
        }
    }

    private async login(email: string, password: string): Promise<void> {
        const response = await ajax.login({ email, password });

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const userData = {
                        name: response.data.name,
                        avatar: response.data.avatar || '/img/defaultAvatar.jpg',
                        subtitle: response.data.subtitle || 'Блог'
                    };
                    this.sendAction('USER_LOGIN_SUCCESS', { user: userData });
                } else {
                    this.sendAction('USER_LOGIN_FAIL', { error: 'No user data in response' });
                }
                break;
            case STATUS.unauthorized: //todo
            case STATUS.badRequest:
            case STATUS.notFound:
                this.sendAction('USER_LOGIN_FAIL', { 
                    error: 'Email или пароль указаны неверно'
                });
                break;
            default:
                this.sendAction('USER_LOGIN_FAIL', { 
                    error: response.data?.error || response.message || 'Ошибка авторизации'
                });
        }
    }

    private async logout(): Promise<void> {
        const response = await ajax.logout();

        if (response.status === STATUS.ok) {
            this.sendAction('USER_LOGOUT');
        } else {
            this.sendAction('USER_LOGOUT_FAIL', { error: 'Logout failed' });
        }
    }


    private async signUp(name: string, email: string, password: string): Promise<void> {
        const response = await ajax.register({ name, email, password });

        switch (response.status) {
            case STATUS.ok:
            case 201:
                this.sendAction('USER_SIGNUP_SUCCESS');
                break;
            case STATUS.conflict:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: 'Пользователь с таким email уже зарегистрирован'
                });
                break;
            case STATUS.badRequest:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: response.data?.globalError || response.message || 'Ошибка регистрации'
                });
                break;
            default:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: response.data?.globalError || response.message || 'Ошибка регистрации'
                });
        }
    }

    private async loadPosts(): Promise<void> {
        const response = await ajax.getFeed();

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    this.sendAction('POSTS_LOAD_SUCCESS', { posts: response.data });
                } else {
                    this.sendAction('POSTS_LOAD_FAIL', { error: 'No posts data' });
                }
                break;
            case STATUS.noMoreContent:
                this.sendAction('POSTS_LOAD_FAIL', { 
                    error: 'No more content'
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('POSTS_LOAD_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('POSTS_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки постов' 
                });
        }
    }
}

// cозд и экспорт единственный экземпляр
export const api = new API();
export default api;