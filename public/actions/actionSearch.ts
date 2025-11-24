import { dispatcher } from '../dispatcher/dispatcher';

export const searchActions = {
    searchBlogs(query: string): void {
        dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
    },
    
    searchBlogsSuccess(users: any[], query: string): void {
        dispatcher.dispatch('SEARCH_BLOGS_SUCCESS', { users, query });
    },
    
    searchBlogsFail(error: string): void {
        dispatcher.dispatch('SEARCH_BLOGS_FAIL', { error });
    },
    
    clearSearch(): void {
        dispatcher.dispatch('SEARCH_CLEAR');
    }
};