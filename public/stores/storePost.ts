import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { subscriptionsStore } from '../stores/storeSubscriptions'; // ⚠️ ИМПОРТ!

export interface Post {
    id: string;
    authorId?: number;
    authorName?: string;
    authorAvatar?: string;
    title?: string;
    content?: string;
    tags?: string[];
    commentsCount?: number;
    repostsCount?: number;
    viewsCount?: number;
    theme?: string;
    isAuthorSubscribed?: boolean;
}

export interface PostState {
    post: Post | null;
    isLoading: boolean;
    error: string | null;
}

class PostStore extends BaseStore<PostState> {
    constructor() {
        super({
            post: null,
            isLoading: false,
            error: null
        });
        
        // ⚠️ ПОДПИСЫВАЕМСЯ НА ИЗМЕНЕНИЯ ПОДПИСОК
        subscriptionsStore.addListener(() => {
            this.updatePostSubscription();
        });
    }
    
    // ⚠️ НОВЫЙ МЕТОД: Обновить подписку в посте
    private updatePostSubscription(): void {
        const state = this.getState();
        if (!state.post || !state.post.authorId) return;
        
        const isSubscribed = subscriptionsStore.isSubscribed(String(state.post.authorId));
        
        if (state.post.isAuthorSubscribed !== isSubscribed) {
            console.log('🔄 [PostStore] Updating post subscription:', {
                postId: state.post.id,
                authorId: state.post.authorId,
                newState: isSubscribed
            });
            
            this.setState({
                ...state,
                post: {
                    ...state.post,
                    isAuthorSubscribed: isSubscribed
                }
            });
        }
    }

    protected registerActions(): void {
        this.registerAction('POST_LOAD_REQUEST', () => {
            this.setState({
                isLoading: true,
                error: null,
                post: null
            });
        });

        this.registerAction('POST_LOAD_SUCCESS', (payload: { post: Post }) => {
            // ⚠️ ВАЖНО: Добавляем isAuthorSubscribed при загрузке поста
            const postWithSubscription = {
                ...payload.post,
                isAuthorSubscribed: payload.post.authorId ? 
                    subscriptionsStore.isSubscribed(String(payload.post.authorId)) : 
                    false
            };
            
            this.setState({
                post: postWithSubscription,
                isLoading: false,
                error: null
            });
        });

        this.registerAction('POST_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                post: null,
                isLoading: false,
                error: payload.error
            });
        });
        
        // ⚠️ ДОБАВИТЬ: Обновлять пост при подписке/отписке
        this.registerAction('SUBSCRIBE_SUCCESS', (payload: { userId: string; targetProfileId?: string }) => {
            console.log('🔄 [PostStore] SUBSCRIBE_SUCCESS - updating post');
            this.updatePostSubscription();
        });

        this.registerAction('UNSUBSCRIBE_SUCCESS', (payload: { userId: string; targetProfileId?: string }) => {
            console.log('🔄 [PostStore] UNSUBSCRIBE_SUCCESS - updating post');
            this.updatePostSubscription();
        });
    }
}

export const postStore = new PostStore();