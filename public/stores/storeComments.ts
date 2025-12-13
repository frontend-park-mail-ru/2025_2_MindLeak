import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { router } from '../router/router';
import { subscriptionsStore } from '../stores/storeSubscriptions'; // ⚠️ ИМПОРТ!

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    text: string;
    postTitle: string;
    postDate: string;
    attachment?: { image?: string; file?: string; fileName?: string };
    repliesCount: number;
    isAuthorSubscribed?: boolean; // ⚠️ ДОБАВИТЬ ЭТО ПОЛЕ!
}

export interface CommentsState {
    comments: Comment[];
    isLoading: boolean;
    error: string | null;
    postId: string | null;
}

class CommentsStore extends BaseStore<CommentsState> {
    constructor() {
        super({
            comments: [],
            isLoading: false,
            error: null,
            postId: null
        });
        
        // ⚠️ ПОДПИСЫВАЕМСЯ НА ИЗМЕНЕНИЯ ПОДПИСОК
        subscriptionsStore.addListener(() => {
            this.updateCommentSubscriptions();
        });
    }
    
    // ⚠️ НОВЫЙ МЕТОД: Обновить подписки в комментариях
    private updateCommentSubscriptions(): void {
        const state = this.getState();
        if (!state.comments || state.comments.length === 0) return;
        
        const updatedComments = state.comments.map(comment => {
            // Проверяем текущее состояние подписки
            const isCurrentlySubscribed = subscriptionsStore.isSubscribed(comment.authorId);
            
            // Если состояние изменилось, обновляем
            if (comment.isAuthorSubscribed !== isCurrentlySubscribed) {
                return {
                    ...comment,
                    isAuthorSubscribed: isCurrentlySubscribed
                };
            }
            return comment;
        });
        
        // Проверяем действительно ли что-то изменилось
        let hasChanges = false;
        for (let i = 0; i < state.comments.length; i++) {
            if (state.comments[i].isAuthorSubscribed !== updatedComments[i].isAuthorSubscribed) {
                hasChanges = true;
                break;
            }
        }
        
        if (hasChanges) {
            console.log('🔄 [CommentsStore] Updating comment subscriptions');
            this.setState({
                ...state,
                comments: updatedComments
            });
        }
    }

    protected registerActions(): void {
        this.registerAction('COMMENTS_LOAD_REQUEST', (payload: { postId: string }) => {
            this.setState({
                ...this.state,
                isLoading: true,
                error: null,
                postId: payload.postId
            });
        });

        this.registerAction('COMMENTS_LOAD_SUCCESS', (payload: { comments: Comment[] }) => {
            // ⚠️ ВАЖНО: Добавляем isAuthorSubscribed при загрузке комментариев
            const commentsWithSubscription = payload.comments.map(comment => ({
                ...comment,
                isAuthorSubscribed: subscriptionsStore.isSubscribed(comment.authorId)
            }));
            
            this.setState({
                ...this.state,
                comments: commentsWithSubscription,
                isLoading: false,
                error: null
            });
        });

        this.registerAction('COMMENTS_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                ...this.state,
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('COMMENT_CREATE_REQUEST', () => {
            this.setState({
                ...this.state,
                isLoading: true // Устанавливаем загрузку при отправке
            });
        });

        // ИЗМЕНЕНИЕ: Добавляем payload и перезагружаем комментарии
        this.registerAction('COMMENT_ADDED_SUCCESS', (payload: { postId?: string }) => {
            console.log('✅ COMMENT_ADDED_SUCCESS received with payload:', payload);
            
            // Вместо перезагрузки страницы перезагружаем комментарии
            const postId = payload?.postId || this.state.postId;
            if (postId) {
                console.log('🔄 Dispatching COMMENTS_LOAD_REQUEST for postId:', postId);
                dispatcher.dispatch('COMMENTS_LOAD_REQUEST', { postId });
            } else {
                console.error('❌ No postId for COMMENT_ADDED_SUCCESS');
            }
        });

        // Добавим действие для сброса ошибки
        this.registerAction('COMMENT_ADD_FAIL', (payload: { error: string }) => {
            this.setState({
                ...this.state,
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('REPLY_ADDED_SUCCESS', (payload: { 
            commentId: string; 
            postId: string;
            shouldNavigate?: boolean;
        }) => {
            console.log('✅ REPLY_ADDED_SUCCESS received:', payload);
            
            // ⚠️ ЕСЛИ НУЖНО ПЕРЕЙТИ К ПРОСМОТРУ ОТВЕТОВ
            if (payload.shouldNavigate) {
                console.log('🔄 Navigating to replies view for comment:', payload.commentId);
                window.location.href = `/replies/${payload.commentId}?postId=${payload.postId}`;
            } 
            // ⚠️ ИНАЧЕ - ОБЫЧНАЯ ПЕРЕЗАГРУЗКА (для ответа на сам пост)
            else {
                console.log('🔄 Reloading comments for post:', payload.postId);
                dispatcher.dispatch('COMMENTS_LOAD_REQUEST', { postId: payload.postId });
            }
        });

        this.registerAction('REPLIES_LOAD_REQUEST', (payload: { commentId: string; articleId: string}) => {
            this.setState({
                ...this.state,
                isLoading: true,
                error: null
            });
        });

        this.registerAction('REPLIES_LOAD_SUCCESS', (payload: { replies: Comment[] }) => {
            // ⚠️ ВАЖНО: Добавляем isAuthorSubscribed при загрузке ответов
            const repliesWithSubscription = payload.replies.map(reply => ({
                ...reply,
                isAuthorSubscribed: subscriptionsStore.isSubscribed(reply.authorId)
            }));
            
            this.setState({
                ...this.state,
                comments: repliesWithSubscription,
                isLoading: false,
                error: null
            });
        });

        this.registerAction('REPLIES_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                ...this.state,
                isLoading: false,
                error: payload.error
            });
        });

        // ⚠️ ДОБАВИТЬ: Обновлять комментарии при подписке/отписке
        this.registerAction('SUBSCRIBE_SUCCESS', (payload: { userId: string; targetProfileId?: string }) => {
            console.log('🔄 [CommentsStore] SUBSCRIBE_SUCCESS - updating comments');
            this.updateCommentSubscriptions();
        });

        this.registerAction('UNSUBSCRIBE_SUCCESS', (payload: { userId: string; targetProfileId?: string }) => {
            console.log('🔄 [CommentsStore] UNSUBSCRIBE_SUCCESS - updating comments');
            this.updateCommentSubscriptions();
        });
    }
}

export const commentsStore = new CommentsStore();