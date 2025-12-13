import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { router } from '../router/router';

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
            this.setState({
                ...this.state,
                comments: payload.comments,
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

        // ИЗМЕНЕНИЕ: Добавляем payload и перезагружаем ответы
        this.registerAction('REPLY_ADDED_SUCCESS', (payload: { commentId: string; postId: string }) => {
            // Перезагружаем ответы для конкретного комментария
            dispatcher.dispatch('REPLIES_LOAD_REQUEST', { 
                commentId: payload.commentId, 
                articleId: payload.postId 
            });
        });

        this.registerAction('REPLIES_LOAD_REQUEST', (payload: { commentId: string; articleId: string}) => {
            this.setState({
                ...this.state,
                isLoading: true,
                error: null
            });
        });

        this.registerAction('REPLIES_LOAD_SUCCESS', (payload: { replies: Comment[] }) => {
            this.setState({
                ...this.state,
                comments: payload.replies,
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

    }

}

export const commentsStore = new CommentsStore();