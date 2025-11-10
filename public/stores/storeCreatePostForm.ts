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
            editingPostId: null
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
                editingPostId: null
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
            // ПЕРЕД загрузкой новых данных сбрасываем success флаг
            this.setState({
                draftTitle: payload.post.title || '',
                draftContent: payload.post.content || '',
                currentTheme: payload.post.theme || 'Без темы',
                currentThemeId: payload.post.topic_id || 0,
                isEditing: true,
                editingPostId: payload.post.id,
                success: false, // СБРАСЫВАЕМ success флаг
                error: null
            });
        });

        this.registerAction('CREATE_POST_REQUEST', () => {
            this.setState({ isCreating: true, error: null });
        });

        this.registerAction('CREATE_POST_SUCCESS', () => {
            this.setState({ isCreating: false, success: true, error: null });
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
                editingPostId: null // СБРАСЫВАЕМ ID редактируемого поста
            });
        });

        // ДОБАВЛЯЕМ: Сброс при закрытии формы без сохранения
        this.registerAction('CREATE_POST_FORM_CLOSE', () => {
            this.setState({
                isEditing: false,
                editingPostId: null,
                success: false,
                error: null
            });
        });

        this.registerAction('POST_EDIT_LOAD_SUCCESS', (payload: { post: any }) => {
            // ПЕРЕД загрузкой новых данных сбрасываем success флаг
            this.setState({
                draftTitle: payload.post.title || '',
                draftContent: payload.post.content || '',
                currentTheme: payload.post.theme || 'Без темы',
                currentThemeId: payload.post.topic_id || 0,
                isEditing: true,
                editingPostId: payload.post.id,
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
    }
}

export const createPostStore = new CreatePostStore();
