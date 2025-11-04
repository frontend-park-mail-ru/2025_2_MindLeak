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

            case 'PROFILE_LOAD_REQUEST':
                this.loadProfile(payload.userId);
                break;
            case 'PROFILE_UPDATE_DESCRIPTION_REQUEST':
                this.updateProfileDescription(payload.description);
                break;

            case 'SETTINGS_ACCOUNT_LOAD_REQUEST':
                this.loadSettingsAccount();
                break;
            case 'SETTINGS_ACCOUNT_UPDATE_REQUEST':
                this.updateSettingsAccount(payload.settings);
                break;

            case 'EDIT_PROFILE_UPDATE_REQUEST':
                this.updateSettingsAccount(payload.settings);
                break;
            case 'ACCOUNT_DELETE_REQUEST':
                this.deleteAccount();
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
            case STATUS.unauthorized:
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
                case STATUS.ok:
                if (response.data) {
                    const postsWithAuthorId = response.data.map((post: any) => ({
                        ...post,
                        author_id: post.author_id || post.authorId || null
                    }));
                    
                    this.sendAction('POSTS_LOAD_SUCCESS', { posts: postsWithAuthorId });
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

    private async loadProfile(userId?: number): Promise<void> {
        // URL С QUERY ПАРАМЕТРОМ (так сказал БЭК)
        let url = '/profile'; // свой профиль по умолчанию
        
        if (userId) {
            url = `/user?id=${userId}`; // чужой профиль
        }
        
        const response = await ajax.get(url);
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const profileData = {
                        id: response.data.id,
                        name: response.data.name,
                        email: response.data.email,
                        avatar: response.data.avatar || '/img/defaultAvatar.jpg',
                        cover: response.data.cover || '/img/defaultCover.jpg',
                        description: response.data.description,
                        subscribersCount: response.data.subscribers_count || 0,
                        subscriptionsCount: response.data.subscriptions_count || 0,
                        postsCount: response.data.posts_count || 0,
                        isSubscribed: response.data.is_subscribed || false
                    };

                    const posts = response.data.posts || [];
                    
                    this.sendAction('PROFILE_LOAD_SUCCESS', {
                        profile: profileData,
                        posts: posts
                    });
                } else {
                    this.sendAction('PROFILE_LOAD_FAIL', { 
                        error: 'No profile data' 
                    });
                }
                break;
            case STATUS.notFound:
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: 'Профиль не найден' 
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: 'Not authenticated' 
                });
                break;
            default:
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки профиля' 
                });
        }
    }

    private async updateProfileDescription(description: string): Promise<void> {
        const response = await ajax.post('/profile', { description });
        
        switch (response.status) {
            case STATUS.ok:
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_SUCCESS', { 
                    description: description 
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_FAIL', { 
                    error: 'Not authenticated' 
                });
                break;
            default:
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_FAIL', { 
                    error: response.message || 'Ошибка обновления описания' 
                });
        }
    }

    //Сведения об аккаунте
    private async loadSettingsAccount(): Promise<void> {
        const response = await ajax.get('/profile');
        
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    // Преобразуем данные API в формат store
                    const settingsData = {
                        phone: response.data.phone || '',
                        country: response.data.country || 'Россия',
                        language: response.data.language || 'Русский',
                        sex: response.data.sex || 'other',
                        date_of_birth: response.data.date_of_birth || '',
                        cover: response.data.cover || '/img/defaultCover.jpg',
                        name: response.data.name || '',
                        avatar_url: response.data.avatar_url || '/img/defaultAvatar.jpg',
                        email: response.data.email || '',
                        created_at: response.data.created_at || ''
                    };
                    this.sendAction('SETTINGS_ACCOUNT_LOAD_SUCCESS', { settings: settingsData });
                } else {
                    this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { error: 'No settings data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки настроек' 
                });
        }
    }

    private async updateSettingsAccount(settings: any): Promise<void> {
        const response = await ajax.put('/profile', settings);
        
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {

                    const updatedSettings = {
                        phone: response.data.phone || '',
                        country: response.data.country || 'Россия',
                        language: response.data.language || 'Русский',
                        sex: response.data.sex || 'other',
                        date_of_birth: response.data.date_of_birth || '',
                        cover: response.data.cover || '/img/defaultCover.jpg',
                        name: response.data.name || '',
                        avatar_url: response.data.avatar_url || '/img/defaultAvatar.jpg',
                        email: response.data.email || '',
                        created_at: response.data.created_at || ''
                    };
                    this.sendAction('SETTINGS_ACCOUNT_UPDATE_SUCCESS', { settings: updatedSettings });
                } else {
                    this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { error: 'No updated data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { 
                    error: response.message || 'Ошибка обновления настроек' 
                });
        }
    }

    private async deleteAccount(): Promise<void> {
        const response = await ajax.deleteAccount();
        
        switch (response.status) {
            case STATUS.ok:
                this.sendAction('ACCOUNT_DELETE_SUCCESS');
                this.sendAction('USER_LOGOUT');
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('ACCOUNT_DELETE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('ACCOUNT_DELETE_FAIL', { 
                    error: response.message || 'Ошибка удаления аккаунта' 
                });
        }
    }
    
}

// cозд и экспорт единственный экземпляр
export const api = new API();
export default api;