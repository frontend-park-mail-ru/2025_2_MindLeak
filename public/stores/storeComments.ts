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

        this.registerAction('COMMENT_ADDED_SUCCESS', () => {
            const url = window.location.pathname + window.location.search;
            router.navigate(url);
        });

        this.registerAction('REPLY_ADDED_SUCCESS', () => {
            const url = window.location.pathname + window.location.search;
            router.navigate(url);
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