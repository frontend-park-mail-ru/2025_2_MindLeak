import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';


//Интерфейс поста
export interface Post {
    id?: string;
    authorId?: number;
    authorName?: string;
    authorAvatar?: string;
    theme?: string;
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
    currentFilter: string;
}

class PostsStore extends BaseStore<PostsState> {
    constructor() {
        super({
            posts: [],
            isLoading: false,
            error: null,
            hasMore: true,
            currentFilter: 'fresh'
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

        this.registerAction('POSTS_SET_FILTER', (payload: { filter: string }) => {
            // Очищаем старые посты при смене фильтра
            this.setState({
                posts: [],
                currentFilter: payload.filter,
                hasMore: true,
                error: null,
                isLoading: false
            });
            // И сразу запрашиваем новые
            dispatcher.dispatch('POSTS_LOAD_REQUEST', { filter: payload.filter });
        });

        this.registerAction('POSTS_RELOAD_AFTER_CREATE', () => {
            dispatcher.dispatch('POSTS_LOAD_REQUEST', { filter: this.state.currentFilter });
        });

        this.registerAction('POSTS_RELOAD_AFTER_DELETE', () => {
            dispatcher.dispatch('POSTS_LOAD_REQUEST', { filter: this.state.currentFilter });
        });
    }
}

export const postsStore = new PostsStore();