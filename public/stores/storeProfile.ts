import { BaseStore } from './store';
import { Post } from './storePosts';
import { loginStore } from './storeLogin';
import { dispatcher } from '../dispatcher/dispatcher';
import { subscriptionsStore } from './storeSubscriptions';

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
    isOffline?: boolean;
    requestedId?: string;
}

class ProfileStore extends BaseStore<ProfileState> {
    private subscriptionsLoaded: boolean = false;

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
            isOffline: false,
            requestedId: undefined
        });

        // Подписываемся на загрузку подписок
        subscriptionsStore.addListener(() => {
            this.onSubscriptionsUpdated();
        });
    }

    private onSubscriptionsUpdated(): void {
        const subscriptionState = subscriptionsStore.getState();
        
        // Если подписки загрузились
        if (!subscriptionState.isLoading && !this.subscriptionsLoaded) {
            this.subscriptionsLoaded = true;
            
            const state = this.getState();
            // Если профиль уже загружен, обновляем флаг подписки
            if (state.profile && !state.isMyProfile) {
                const isSubscribed = subscriptionsStore.isSubscribed(state.profile.id);
                
                if (state.profile.isSubscribed !== isSubscribed) {
                    console.log('🔄 [storeProfile] Updating subscription flag after load:', {
                        profileId: state.profile.id,
                        newFlag: isSubscribed
                    });
                    
                    this.setState({
                        profile: {
                            ...state.profile,
                            isSubscribed: isSubscribed
                        }
                    });
                }
            }
        }
    }

    protected registerActions(): void {
        this.registerAction('PROFILE_LOAD_REQUEST', (payload: { userId?: string }) => {
            // Сбрасываем флаг загрузки подписок при новой загрузке профиля
            this.subscriptionsLoaded = subscriptionsStore.getState().isLoading ? false : true;
            
            this.setState({
                isLoading: true,
                error: null,
                isOffline: false,
                requestedId: payload?.userId
            });
        });

        this.registerAction('PROFILE_LOAD_SUCCESS', (payload: { profile: ProfileData; posts: Post[] }) => {
            const loginState = loginStore.getState();
            const subscriptionState = subscriptionsStore.getState();
            
            let isMyProfile = false;
            if (payload.profile && loginState.user) {
                isMyProfile = String(payload.profile.id) === String(loginState.user.id);
            }

            const updatedProfile = { ...payload.profile };
            
            // ⚠️ ВАЖНО: Если подписки уже загружены - используем локальный store
            if (!isMyProfile && !subscriptionState.isLoading) {
                updatedProfile.isSubscribed = subscriptionsStore.isSubscribed(updatedProfile.id);
            }

            console.log('🔍 [storeProfile] Profile subscription:', {
                profileId: updatedProfile.id,
                serverFlag: payload.profile.isSubscribed,
                localFlag: updatedProfile.isSubscribed,
                subscriptionsLoaded: !subscriptionState.isLoading,
                isMyProfile: isMyProfile
            });
            
            this.setState({
                profile: updatedProfile,
                posts: payload.posts,
                isLoading: false,
                error: null,
                isMyProfile: isMyProfile,
                isOffline: false
            });
        });

        this.registerAction('PROFILE_LOAD_FAIL', (payload: { error: string; isOffline?: boolean; requestedId?: string }) => {
            const currentState = this.getState();
            
            if (payload.isOffline) {
                this.setState({
                    isLoading: false,
                    error: payload.error,
                    isOffline: true,
                    requestedId: payload.requestedId,
                    profile: currentState.profile,
                    posts: currentState.posts
                });
            } else {
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

        this.registerAction('PROFILE_RESET_OFFLINE', () => {
            this.setState({
                isOffline: false,
                error: null
            });
        });

        // ✅ ЭТИ ОБРАБОТЧИКИ ДОЛЖНЫ ВЫЗЫВАТЬ API ЧЕРЕЗ DISPATCHER
        this.registerAction('POSTS_RELOAD_AFTER_EDIT', () => {
            const state = this.getState();
            if (state.profile) {
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        this.registerAction('PROFILE_RELOAD_AFTER_DELETE', () => {
            const state = this.getState();
            if (state.profile) {
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        this.registerAction('POSTS_RELOAD_AFTER_CREATE', () => {
            const state = this.getState();
            if (state.profile) {
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: state.profile.id 
                });
            }
        });

        // ... остальные обработчики без изменений ...
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

        this.registerAction('PROFILE_LOAD_COMMENTS_REQUEST', () => {
            this.setState({ isLoading: true, error: null });
        });

        this.registerAction('PROFILE_LOAD_COMMENTS_SUCCESS', (payload: { comments: any[] }) => {
            this.setState({ comments: payload.comments, isLoading: false });
        });

        this.registerAction('PROFILE_LOAD_COMMENTS_FAIL', (payload: { error: string }) => {
            this.setState({ isLoading: false, error: payload.error });
        });

        this.registerAction('SUBSCRIBE_SUCCESS', (payload: { userId: number; targetProfileId: number | string }) => {
            const state = this.getState();
            
            if (state.profile && String(state.profile.id) === String(payload.targetProfileId)) {
                this.setState({
                    profile: {
                        ...state.profile,
                        isSubscribed: true,
                        subscribers: state.profile.subscribers + 1
                    }
                });
            }
            
            const updatedPosts = state.posts.map(post => {
                if (post.authorId === payload.userId) {
                    return {
                        ...post,
                        isAuthorSubscribed: true
                    };
                }
                return post;
            });
            
            this.setState({
                posts: updatedPosts
            });
        });

        this.registerAction('UNSUBSCRIBE_SUCCESS', (payload: { userId: number; targetProfileId: number | string }) => {
            const state = this.getState();
            
            if (state.profile && String(state.profile.id) === String(payload.targetProfileId)) {
                this.setState({
                    profile: {
                        ...state.profile,
                        isSubscribed: false,
                        subscribers: Math.max(0, state.profile.subscribers - 1)
                    }
                });
            }
            
            const updatedPosts = state.posts.map(post => {
                if (post.authorId === payload.userId) {
                    return {
                        ...post,
                        isAuthorSubscribed: false
                    };
                }
                return post;
            });
            
            this.setState({
                posts: updatedPosts
            });
        });

        this.registerAction('SUBSCRIBE_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('UNSUBSCRIBE_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });
    }
}

export const profileStore = new ProfileStore();