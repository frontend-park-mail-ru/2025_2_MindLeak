import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher'; // Добавляем импорт dispatcher

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

        //первое изменение ФФФФФФФФФФФФФФФ ФФФФФФФФФФФФФ
        this.registerAction('USER_LOGIN_CHECKED', (payload: { user: User }) => {
            // Добавляем timestamp к URL аватара для избежания кэширования
            const userWithCacheBust = {
                ...payload.user,
                avatar: payload.user.avatar ? 
                    `${payload.user.avatar}${payload.user.avatar.includes('?') ? '&' : '?'}nocache=${Date.now()}` :
                    payload.user.avatar,
                email: payload.user.email || ''
            };
            
            const newState = {
                user: userWithCacheBust,
                isLoggedIn: true,
                isLoading: false,
                error: null
            };
            this.setState(newState);
            this.saveAuthState(newState);
        });

        this.registerAction('USER_LOGIN_SUCCESS', (payload: { user: User }) => {
            // Добавляем timestamp к URL аватара
            const userWithCacheBust = {
                ...payload.user,
                avatar: payload.user.avatar ? 
                    `${payload.user.avatar}${payload.user.avatar.includes('?') ? '&' : '?'}nocache=${Date.now()}` :
                    payload.user.avatar
            };
            
            const newState = {
                user: userWithCacheBust,
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

        this.registerAction('USER_UPDATE_PROFILE', (payload: { user: any }) => {
            console.log('🔄 Updating user in loginStore:', payload.user);
            const currentState = this.getState();
            
            // Обновляем ВСЕ поля пользователя
            let updatedUser = {
                ...currentState.user,
                ...payload.user
            };
            
            // ✅ ВАЖНО: Если обновляется аватар, сохраняем timestamp
            if (payload.user?.avatar && currentState.user?.avatar) {
                // Проверяем, есть ли уже timestamp в старом аватаре
                const oldAvatar = currentState.user.avatar;
                const hasTimestamp = oldAvatar.includes('?_=') || oldAvatar.includes('&_=');
                
                if (hasTimestamp) {
                    // Сохраняем timestamp из старого URL
                    const timestampMatch = oldAvatar.match(/[?&]_=(\d+)/);
                    if (timestampMatch) {
                        const timestamp = timestampMatch[1];
                        const baseUrl = payload.user.avatar.split('?')[0];
                        updatedUser.avatar = `${baseUrl}?_=${timestamp}`;
                        console.log('✅ Preserved timestamp from old avatar:', updatedUser.avatar);
                    }
                }
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
                // ✅ Добавляем timestamp ТОЛЬКО ЗДЕСЬ
                const timestampedAvatar = `${payload.avatar}${payload.avatar.includes('?') ? '&' : '?'}_=${Date.now()}`;
                
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
                        avatar: payload.avatar // Используем как есть (уже с timestamp)
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