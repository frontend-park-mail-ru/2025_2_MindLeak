import { dispatcher } from '../dispatcher/dispatcher';

export const commentsActions = {
    loadComments(postId: string): void {
        dispatcher.dispatch('COMMENTS_LOAD_REQUEST', { postId });
    },

    addCommentSuccess(postId: string): void {
        dispatcher.dispatch('COMMENT_ADDED_SUCCESS', { postId });
    },

    addComment(postId: string, text: string, attachment?: File): void {
        dispatcher.dispatch('COMMENT_CREATE_REQUEST', { postId, text, attachment });
    }
};