import { BaseStore } from './store';
import { Post } from './storePosts';
import { loginStore } from './storeLogin';
import { dispatcher } from '../dispatcher/dispatcher';

export interface ProfileData {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    cover_url: string;
    description: string;
    subscribers: number;
    subscriptions: number;
    postsCount: number;
    isSubscribed: boolean;
}

export interface ProfileState {
    profile: ProfileData | null;
    posts: Post[];
    comments: any[];
    activeTab: 'posts' | 'comments';
    isLoading: boolean;
    error: string | null;
    isEditingDescription: boolean;
    isMyProfile?: boolean;
    isOffline?: boolean; // Добавляем флаг оффлайн
    requestedId?: string; // Добавляем запрошенный ID
}

class ProfileStore extends BaseStore<ProfileState> {
    constructor() {
        super({
            profile: null,
            posts: [],
            comments: [],
            activeTab: 'posts',
            isLoading: false,
            error: null,
            isEditingDescription: false,
            isMyProfile: false,
            isOffline: false, // Инициализируем
            requestedId: undefined
        });
    }

    protected registerActions(): void {
        this.registerAction('PROFILE_LOAD_REQUEST', (payload: { userId?: string }) => {
            this.setState({
                isLoading: true,
                error: null,
                isOffline: false, // Сбрасываем при новом запросе
                requestedId: payload?.userId // Сохраняем запрошенный ID
            });
        });

        this.registerAction('PROFILE_LOAD_SUCCESS', (payload: { profile: ProfileData; posts: Post[] }) => {
            const loginState = loginStore.getState();
            
            // ПРАВИЛЬНАЯ логика определения isMyProfile
            let isMyProfile = false;
            
            if (payload.profile && loginState.user) {
                // Сравниваем ID профиля с ID текущего пользователя
                isMyProfile = payload.profile.id === loginState.user.id.toString();
            }
            
            this.setState({
                profile: payload.profile,
                posts: payload.posts,
                isLoading: false,
                error: null,
                isMyProfile: isMyProfile,
                isOffline: false // Успешная загрузка - не оффлайн
            });
        });

        // ОБНОВЛЯЕМ: Добавляем обработку оффлайн ошибки
        this.registerAction('PROFILE_LOAD_FAIL', (payload: { error: string; isOffline?: boolean; requestedId?: string }) => {
            const currentState = this.getState();
            
            // Если это оффлайн ошибка, не очищаем данные полностью
            if (payload.isOffline) {
                this.setState({
                    isLoading: false,
                    error: payload.error,
                    isOffline: true,
                    requestedId: payload.requestedId,
                    // Сохраняем старые данные, если они есть
                    profile: currentState.profile,
                    posts: currentState.posts
                });
            } else {
                // Если обычная ошибка - очищаем
                this.setState({
                    profile: null,
                    posts: [],
                    isLoading: false,
                    error: payload.error,
                    isOffline: false,
                    requestedId: payload.requestedId
                });
            }
        });

        // ДОБАВЛЯЕМ: Обработчик для сброса оффлайн состояния
        this.registerAction('PROFILE_RESET_OFFLINE', () => {
            this.setState({
                isOffline: false,
                error: null
            });
        });

        // ДОБАВЛЯЕМ: Обновление постов после редактирования
        this.registerAction('POSTS_RELOAD_AFTER_EDIT', () => {
            const state = this.getState();
            if (state.profile) {
                // Перезагружаем профиль чтобы обновить посты
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        this.registerAction('PROFILE_RELOAD_AFTER_DELETE', () => {
            const state = this.getState();
            if (state.profile) {
                // Перезагружаем профиль чтобы обновить посты
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        this.registerAction('POSTS_RELOAD_AFTER_CREATE', () => {
            const state = this.getState();
            if (state.profile) {
                // Перезагружаем профиль чтобы обновить посты
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        this.registerAction('PROFILE_CHANGE_TAB', (payload: { tab: 'posts' | 'comments' }) => {
            this.setState({
                activeTab: payload.tab
            });
        });

        this.registerAction('PROFILE_START_EDIT_DESCRIPTION', () => {
            this.setState({
                isEditingDescription: true
            });
        });

        this.registerAction('PROFILE_CANCEL_EDIT_DESCRIPTION', () => {
            this.setState({
                isEditingDescription: false
            });
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_SUCCESS', (payload: { description: string }) => {
            if (this.state.profile) {
                this.setState({
                    profile: {
                        ...this.state.profile,
                        description: payload.description
                    },
                    isLoading: false,
                    isEditingDescription: false,
                    error: null
                });
            }
        });

        this.registerAction('PROFILE_UPDATE_DESCRIPTION_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });
    }
}

export const profileStore = new ProfileStore();