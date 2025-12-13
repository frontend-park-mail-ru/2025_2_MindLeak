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
    },

    // ⚠️ ДОБАВЛЯЕМ ДЛЯ ОТВЕТОВ НА КОММЕНТАРИИ
    addReplySuccess(commentId: string, postId: string, shouldNavigate: boolean = false): void {
        dispatcher.dispatch('REPLY_ADDED_SUCCESS', { 
            commentId, 
            postId,
            shouldNavigate // ⚠️ Флаг для перехода
        });
    },

    addReply(commentId: string, postId: string, text: string, attachment?: File): void {
        dispatcher.dispatch('REPLY_CREATE_REQUEST', { 
            commentId, 
            postId, 
            text, 
            attachment 
        });
    },

    loadReplies(commentId: string, articleId: string): void {
        dispatcher.dispatch('REPLIES_LOAD_REQUEST', { 
            commentId, 
            articleId 
        });
    }
};