import { dispatcher } from '../dispatcher/dispatcher';
import { Post } from '../stores/storePosts';

export const postsActions = {

    loadStart(): void {
        dispatcher.dispatch('POSTS_LOAD_START');
    },

    loadSuccess(posts: Post[]): void {
        dispatcher.dispatch('POSTS_LOAD_SUCCESS', { posts });
    },

    loadFail(error: string): void {
        dispatcher.dispatch('POSTS_LOAD_FAIL', { error });
    },

    // todo надо ли в итоге ?
    clear(): void {
        dispatcher.dispatch('POSTS_CLEAR');
    }
};