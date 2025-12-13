// storeLogin.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ (полностью)
import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';

export interface User {
    id: string;
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
        super({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: null
        });
        this.restoreAuthState();
    }

    protected registerActions(): void {
        this.registerAction('USER_LOGIN_CHECKED', (payload: { user: User }) => {
            console.log('🔄 USER_LOGIN_CHECKED payload:', payload);
            
            const newState = {
                user: payload.user,
                isLoggedIn: true,
                isLoading: false,
                error: null
            };
            this.setState(newState);
            this.saveAuthState(newState);
            
            // ✅ ЗАГРУЖАЕМ ПОДПИСКИ ПРИ ПРОВЕРКЕ АВТОРИЗАЦИИ
            console.log('🔄 Loading subscriptions after auth check...');
            dispatcher.dispatch('SUBSCRIPTIONS_LOAD_REQUEST');
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
            
            // ✅ ЗАГРУЖАЕМ ПОДПИСКИ ПОСЛЕ УСПЕШНОГО ЛОГИНА
            console.log('🔄 Loading subscriptions after login...');
            dispatcher.dispatch('SUBSCRIPTIONS_LOAD_REQUEST');
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

        this.registerAction('USER_UPDATE_PROFILE', (payload: { user: any }) => {
            console.log('🔄 Updating user in loginStore:', payload.user);
            const currentState = this.getState();
            
            let updatedUser = {
                ...currentState.user,
                ...payload.user
            };
            
            if (payload.user?.avatar && currentState.user?.avatar !== payload.user.avatar) {
                const baseUrl = payload.user.avatar.split('?')[0];
                updatedUser.avatar = `${baseUrl}?_=${Date.now()}`;
                console.log('✅ Avatar updated with timestamp:', updatedUser.avatar);
            }
            
            const newState = {
                ...currentState,
                user: updatedUser
            };
            
            console.log('🔄 New loginStore state:', newState);
            this.setState(newState);
            this.saveAuthState(newState);
        });

        this.registerAction('AVATAR_UPLOADED', (payload: { avatar: string }) => {
            console.log('🖼️ AVATAR_UPLOADED action in loginStore');
            
            const currentState = this.getState();
            if (currentState.user) {
                const baseUrl = payload.avatar.split('?')[0];
                const timestampedAvatar = `${baseUrl}?_=${Date.now()}`;
                
                const newState = {
                    ...currentState,
                    user: {
                        ...currentState.user,
                        avatar: timestampedAvatar
                    }
                };
                
                console.log('✅ Updated avatar with timestamp:', timestampedAvatar);
                this.setState(newState);
                this.saveAuthState(newState);
                
                dispatcher.dispatch('PROFILE_DATA_CHANGED');
                dispatcher.dispatch('HEADER_FORCE_REFRESH');
            }
        });

        this.registerAction('UPDATE_AVATAR_ONLY', (payload: { avatar: string }) => {
            console.log('🖼️ UPDATE_AVATAR_ONLY action in loginStore');
            
            const currentState = this.getState();
            if (currentState.user) {
                const newState = {
                    ...currentState,
                    user: {
                        ...currentState.user,
                        avatar: payload.avatar
                    }
                };
                
                console.log('✅ Updated avatar only:', payload.avatar);
                this.setState(newState);
                this.saveAuthState(newState);
            }
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

            // ✅ ОЧИЩАЕМ ПОДПИСКИ ПРИ ВЫХОДЕ
            dispatcher.dispatch('SUBSCRIPTIONS_CLEAR');
            
            dispatcher.dispatch('HEADER_FORCE_REFRESH');
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
            
            // ✅ ОЧИЩАЕМ ПОДПИСКИ ПРИ ИСТЕЧЕНИИ СЕССИИ
            dispatcher.dispatch('SUBSCRIPTIONS_CLEAR');
        });
    }

    private restoreAuthState(): void {
        try {
            const saved = localStorage.getItem('authState');
            if (saved) {
                const parsed = JSON.parse(saved);
                const savedTime = localStorage.getItem('authStateTime');
                if (savedTime) {
                    const timeDiff = Date.now() - parseInt(savedTime);
                    if (timeDiff > 24 * 60 * 60 * 1000) {
                        this.clearAuthState();
                        return;
                    }
                }
                
                this.setState({
                    user: parsed.user,
                    isLoggedIn: parsed.isLoggedIn
                });
                
                // ✅ ЗАГРУЖАЕМ ПОДПИСКИ ПРИ ВОССТАНОВЛЕНИИ СЕССИИ
                if (parsed.isLoggedIn) {
                    console.log('🔄 Loading subscriptions after session restore...');
                    setTimeout(() => {
                        dispatcher.dispatch('SUBSCRIPTIONS_LOAD_REQUEST');
                    }, 500); // Небольшая задержка для стабилизации
                }
            }
        } catch (error) {
            console.error('Error loading auth state from localStorage:', error);
        }
    }

    private saveAuthState(state: LoginState): void {
        try {
            if (!state.user?.id || !state.user?.name) {
                console.warn('⚠️ Not saving incomplete user to localStorage:', state.user);
                return;
            }
            
            const userToSave = {
                id: state.user.id,
                name: state.user.name,
                avatar: state.user.avatar,
                subtitle: state.user.subtitle,
                email: state.user.email
            };
            
            localStorage.setItem('authState', JSON.stringify({
                user: userToSave,
                isLoggedIn: state.isLoggedIn
            }));
            localStorage.setItem('authStateTime', Date.now().toString());
            
            console.log('✅ Saved auth state to localStorage:', userToSave);
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