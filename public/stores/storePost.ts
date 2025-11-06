import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';

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
            this.setState({
                post: payload.post,
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
    }
}

export const postStore = new PostStore();