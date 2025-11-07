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
            console.log('[Store] Выбрана тема:', payload);
            this.setState({
                currentTheme: payload.themeName,
                currentThemeId: payload.topic_id
            });
        });

        this.registerAction('POST_EDIT_LOAD_SUCCESS', (payload: { post: any }) => {
            this.setState({
                draftTitle: payload.post.title || '',
                draftContent: payload.post.content || '',
                currentTheme: payload.post.theme || 'Без темы',
                currentThemeId: payload.post.topic_id || 0,
                isEditing: true,
                editingPostId: payload.post.id
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

        this.registerAction('EDIT_POST_SUCCESS', () => {
            this.setState({ 
                isCreating: false, 
                success: true, 
                error: null,
                isEditing: false,
                editingPostId: null
            });
        });

        this.registerAction('EDIT_POST_FAIL', (payload: { error: string }) => {
            this.setState({ isCreating: false, error: payload.error });
        });
    }
}

export const createPostStore = new CreatePostStore();
