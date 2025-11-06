import { dispatcher } from '../dispatcher/dispatcher';

export const createPost = (data: { title: string; content: string; theme?: string }) => {
    dispatcher.dispatch('CREATE_POST_REQUEST', data);
};

export const selectTheme = (theme: string, key: string) => {
    dispatcher.dispatch('THEME_SELECTED', { theme, key });
};

export const updatePostContent = (content: string) => {
    dispatcher.dispatch('POST_CONTENT_CHANGED', { content });
};

export const addImage = () => {
    dispatcher.dispatch('ADD_IMAGE_REQUEST');
};

export const addLink = () => {
    dispatcher.dispatch('ADD_LINK_REQUEST');
};

export const applyTextFormat = (formatType: string) => {
    dispatcher.dispatch('TEXT_EDIT_APPLY', { type: formatType });
};

export const editPost = (postId: string, data: { title: string; content: string; theme?: string }) => {
    dispatcher.dispatch('EDIT_POST_REQUEST', { postId, ...data });
};