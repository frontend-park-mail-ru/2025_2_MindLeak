import { BaseStore } from './store';

interface SearchState {
    blogs: any[];
    posts: any[];
    query: string;
    isLoading: boolean;
    error: string | null;
}

class SearchStore extends BaseStore<SearchState> {
    constructor() {
        super({
            blogs: [],
            posts: [],
            query: '',
            isLoading: false,
            error: null
        });
    }

    protected registerActions(): void {
        this.registerAction('SEARCH_BLOGS_REQUEST', this.handleSearchBlogsRequest.bind(this));
        this.registerAction('SEARCH_BLOGS_SUCCESS', this.handleSearchBlogsSuccess.bind(this));
        this.registerAction('SEARCH_BLOGS_FAIL', this.handleSearchBlogsFail.bind(this));
        this.registerAction('SEARCH_POSTS_REQUEST', this.handleSearchPostsRequest.bind(this));
        this.registerAction('SEARCH_POSTS_SUCCESS', this.handleSearchPostsSuccess.bind(this));
        this.registerAction('SEARCH_POSTS_FAIL', this.handleSearchPostsFail.bind(this));
        this.registerAction('SEARCH_CLEAR', this.handleSearchClear.bind(this));
    }

    private handleSearchBlogsRequest(payload?: any): void {
        this.setState({
            ...this.state,
            isLoading: true,
            error: null,
            query: payload?.query || ''
        });
    }

    private handleSearchBlogsSuccess(payload?: any): void {
        // ПРЕДОТВРАЩАЕМ ДУБЛИРОВАНИЕ - проверяем query
        if (this.state.query === payload?.query) {
            this.setState({
                ...this.state,
                isLoading: false,
                blogs: payload?.users || [],
                query: payload?.query || this.state.query
            });
        }
    }

    private handleSearchBlogsFail(payload?: any): void {
        this.setState({
            ...this.state,
            isLoading: false,
            error: payload?.error || 'Search failed',
            blogs: [] // ПРИ ОШИБКЕ ТОЖЕ УСТАНАВЛИВАЕМ ПУСТОЙ МАССИВ
        });
    }

    private handleSearchPostsRequest(payload?: any): void {
        this.setState({
            ...this.state,
            isLoading: true,
            error: null,
            query: payload?.query || this.state.query
        });
    }

    private handleSearchPostsSuccess(payload?: any): void {
        // ПРЕДОТВРАЩАЕМ ДУБЛИРОВАНИЕ - проверяем query
        if (this.state.query === payload?.query) {
            this.setState({
                ...this.state,
                isLoading: false,
                posts: payload?.posts || [],
                query: payload?.query || this.state.query
            });
        }
    }

    private handleSearchPostsFail(payload?: any): void {
        this.setState({
            ...this.state,
            isLoading: false,
            error: payload?.error || 'Posts search failed',
            posts: []
        });
    }

    private handleSearchClear(): void {
        this.setState({
            blogs: [],
            posts: [],
            query: '',
            isLoading: false,
            error: null
        });
    }
}

export const searchStore = new SearchStore();