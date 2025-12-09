import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';

export interface CreatePostState {
    draftTitle: string;
    draftContent: string;
    currentTheme: string;
    currentThemeId: number;
    isCreating: boolean;
    success: boolean;
    error: string | null;
    isEditing: boolean;
    editingPostId: string | null;
    mediaUrls: string[]; // Добавляем массив URL медиафайлов
    isUploadingMedia: boolean;
}

class CreatePostStore extends BaseStore<CreatePostState> {
    constructor() {
        super({
            draftTitle: '',
            draftContent: '',
            currentTheme: 'Без темы',
            currentThemeId: 0,
            isCreating: false,
            success: false,
            error: null,
            isEditing: false,
            editingPostId: null,
            mediaUrls: [], // Инициализируем пустым массивом
            isUploadingMedia: false
        });
    }

    protected registerActions(): void {
        this.registerAction('CREATE_POST_FORM_INIT', () => {
            this.setState({
                draftTitle: '',
                draftContent: '',
                currentTheme: 'Без темы',
                currentThemeId: 0,
                isCreating: false,
                success: false,
                error: null,
                isEditing: false,
                editingPostId: null,
                mediaUrls: [], // Сбрасываем медиа при инициализации
                isUploadingMedia: false
            });
        });

        this.registerAction('POST_TITLE_CHANGED', (payload: { title: string }) => {
            this.setState({ draftTitle: payload.title });
        });

        this.registerAction('POST_CONTENT_CHANGED', (payload: { content: string }) => {
            this.setState({ draftContent: payload.content });
        });

        this.registerAction('THEME_SELECTED', (payload: { themeName: string; topic_id: number }) => {
            this.setState({
                currentTheme: payload.themeName,
                currentThemeId: payload.topic_id
            });
        });

        this.registerAction('POST_EDIT_LOAD_SUCCESS', (payload: { post: any }) => {
            // Парсим медиафайлы из контента или получаем отдельным полем
            const mediaUrls = payload.post.mediaUrls || this.extractMediaUrls(payload.post.content) || [];
            
            this.setState({
                draftTitle: payload.post.title || '',
                draftContent: payload.post.content || '',
                currentTheme: payload.post.theme || 'Без темы',
                currentThemeId: payload.post.topic_id || 0,
                isEditing: true,
                editingPostId: payload.post.id,
                mediaUrls: mediaUrls,
                success: false, // СБРАСЫВАЕМ success флаг
                error: null
            });
        });

        this.registerAction('CREATE_POST_REQUEST', () => {
            this.setState({ isCreating: true, error: null });
        });

        this.registerAction('CREATE_POST_SUCCESS', () => {
            this.setState({ 
                isCreating: false, 
                success: true, 
                error: null,
                mediaUrls: [] // Сбрасываем медиа после успешной публикации
            });
        });

        this.registerAction('CREATE_POST_FAIL', (payload: { error: string }) => {
            this.setState({ isCreating: false, success: false, error: payload.error });
        });

        this.registerAction('EDIT_POST_REQUEST', () => {
            this.setState({ isCreating: true, error: null });
        });

        this.registerAction('POST_EDIT_REQUEST', (payload: { postId: string }) => {
            // Устанавливаем флаг редактирования ДО загрузки данных
            this.setState({
                isEditing: true,
                editingPostId: payload.postId,
                success: false,
                error: null,
                isCreating: false
            });
            
            // ЗАПУСКАЕМ ЗАГРУЗКУ ДАННЫХ ПОСТА
            dispatcher.dispatch('POST_EDIT_LOAD_REQUEST', { postId: payload.postId });
        });

        this.registerAction('EDIT_POST_SUCCESS', () => {
            this.setState({ 
                isCreating: false, 
                success: true, 
                error: null,
                isEditing: false, // СБРАСЫВАЕМ флаг редактирования
                editingPostId: null, // СБРАСЫВАЕМ ID редактируемого поста
                mediaUrls: [] // Сбрасываем медиа после успешного редактирования
            });
        });

        // ДОБАВЛЯЕМ: Сброс при закрытии формы без сохранения
        this.registerAction('CREATE_POST_FORM_CLOSE', () => {
            this.setState({
                isEditing: false,
                editingPostId: null,
                success: false,
                error: null,
                mediaUrls: [] // Сбрасываем медиа при закрытии формы
            });
        });

        this.registerAction('POST_EDIT_LOAD_SUCCESS', (payload: { post: any }) => {
            // Парсим медиафайлы из контента или получаем отдельным полем
            const mediaUrls = payload.post.mediaUrls || this.extractMediaUrls(payload.post.content) || [];
            
            this.setState({
                draftTitle: payload.post.title || '',
                draftContent: payload.post.content || '',
                currentTheme: payload.post.theme || 'Без темы',
                currentThemeId: payload.post.topic_id || 0,
                isEditing: true,
                editingPostId: payload.post.id,
                mediaUrls: mediaUrls,
                success: false, // СБРАСЫВАЕМ success флаг
                error: null
            });
        });

        // Добавьте также обработчик ошибки
        this.registerAction('POST_EDIT_LOAD_FAIL', (payload: { error: string }) => {
            this.setState({
                isEditing: false,
                editingPostId: null,
                error: payload.error
            });
        });

        this.registerAction('EDIT_POST_FAIL', (payload: { error: string }) => {
            this.setState({ isCreating: false, error: payload.error });
        });

        // ДЕЙСТВИЯ ДЛЯ РАБОТЫ С МЕДИАФАЙЛАМИ

        this.registerAction('MEDIA_UPLOAD_REQUEST', (payload?: any) => {
            console.log('MEDIA_UPLOAD_REQUEST in store, payload:', payload);
            
            if (!payload || !payload.files) {
                console.error('MEDIA_UPLOAD_REQUEST: Missing files in payload');
            }
            
            this.setState({ isUploadingMedia: true, error: null });
        });

        this.registerAction('MEDIA_UPLOAD_SUCCESS', (payload: { url: string }) => {
            const currentUrls = this.state.mediaUrls || [];
            this.setState({
                isUploadingMedia: false,
                mediaUrls: [...currentUrls, payload.url]
            });
        });

        this.registerAction('MEDIA_UPLOAD_FAIL', (payload: { error: string }) => {
            this.setState({ isUploadingMedia: false, error: payload.error });
        });

        this.registerAction('MEDIA_DELETE_REQUEST', () => {
            this.setState({ error: null });
        });

        this.registerAction('MEDIA_DELETE_SUCCESS', (payload: { url: string }) => {
            const currentUrls = this.state.mediaUrls || [];
            this.setState({
                mediaUrls: currentUrls.filter(url => url !== payload.url)
            });
        });

        this.registerAction('MEDIA_DELETE_FAIL', (payload: { error: string }) => {
            this.setState({ error: payload.error });
        });

        // ДОБАВЛЯЕМ: Сброс медиа при успешной публикации/редактировании
        this.registerAction('CREATE_POST_SUCCESS', () => {
            this.setState({ 
                isCreating: false, 
                success: true, 
                error: null,
                mediaUrls: [] // Сбрасываем медиа после успешной публикации
            });
        });

        this.registerAction('EDIT_POST_SUCCESS', () => {
            this.setState({ 
                isCreating: false, 
                success: true, 
                error: null,
                isEditing: false,
                editingPostId: null,
                mediaUrls: [] // Сбрасываем медиа после успешного редактирования
            });
        });
    }

    private extractMediaUrls(content: string): string[] {
        const regex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|mp4|avi|mov|wmv|pdf|txt|doc|docx|zip))/gi;
        const matches = content.match(regex);
        return matches || [];
    }
}

export const createPostStore = new CreatePostStore();