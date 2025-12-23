import { dispatcher } from '../dispatcher/dispatcher';

export const createPost = (data: { 
    title: string; 
    content: string; 
    topic_id: number;
    attachment?: File | null;
    existingMediaUrl?: string | null;
}) => {
    dispatcher.dispatch('CREATE_POST_REQUEST', data);
};

export function selectTheme(themeName: string, topic_id: number): void {
    dispatcher.dispatch('THEME_SELECTED', { themeName, topic_id });
};

export const updatePostContent = (content: string) => {
    dispatcher.dispatch('POST_CONTENT_CHANGED', { content });
};

export const addAttachment = (file: File) => {
    dispatcher.dispatch('ATTACHMENT_ADDED', { file });
};

export const removeAttachment = () => {
    dispatcher.dispatch('ATTACHMENT_REMOVED');
};

export const clearAttachments = () => {
    dispatcher.dispatch('ATTACHMENT_CLEARED');
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

export const editPost = (postId: string, data: { 
    title: string; 
    content: string; 
    topic_id: number;
    attachment?: File | null;
    existingMediaUrl?: string | null;
    shouldDeleteMedia?: boolean;
}) => {
    dispatcher.dispatch('EDIT_POST_REQUEST', { postId, ...data });
};