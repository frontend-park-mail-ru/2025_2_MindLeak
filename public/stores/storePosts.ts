import { BaseStore } from './store';

//Интерфейс поста
export interface Post {
    id?: string;
    author_name?: string;
    author_avatar?: string;
    title?: string;
    content?: string;
    image?: string;
    tags?: string[];
    commentsCount?: number;
    repostsCount?: number;
    viewsCount?: number;
}

export interface PostsState {
    posts: Post[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
}

class PostsStore extends BaseStore<PostsState> {
    constructor() {
        super({
            posts: [],
            isLoading: false,
            error: null,
            hasMore: true
        });
    }

    protected registerActions(): void {
        this.registerAction('POSTS_LOAD_START', () => {
            this.setState({
                isLoading: true,
                error: null
            });
        });

        this.registerAction('POSTS_LOAD_SUCCESS', (payload: { posts: Post[] }) => {
            this.setState({
                posts: [...this.state.posts, ...payload.posts],
                isLoading: false,
                hasMore: payload.posts.length > 0
            });
        });

        this.registerAction('POSTS_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isLoading: false,
                error: payload.error
            });
        });

        this.registerAction('POSTS_CLEAR', () => {
            this.setState({
                posts: [],
                error: null
            });
        });
    }
}

export const postsStore = new PostsStore();