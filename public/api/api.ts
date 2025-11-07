import { ajax } from '../modules/ajax';
import { dispatcher } from '../dispatcher/dispatcher';

const STATUS = {
    ok: 200,
    noMoreContent: 204,
    badRequest: 400,
    unauthorized: 401,
    notFound: 404,
    conflict: 409,
};

class API {
    handleAction(actionType: string, payload?: any): void {
        console.log(`API action: ${actionType}`, payload);

        switch (actionType) {
            case 'LOGIN_CHECK_REQUEST':
                this.checkAuth();
                break;
            case 'LOGIN_REQUEST':
                this.login(payload.email, payload.password);
                break;
            case 'LOGOUT_REQUEST':
                this.logout();
                break;
            case 'SIGNUP_REQUEST':
                this.signUp(payload.name, payload.email, payload.password);
                break;
            case 'POSTS_LOAD_REQUEST':
                this.loadPosts(payload?.filter);
                break;
            case 'POST_LOAD_REQUEST':
                this.loadPost(payload.postId);
                break;
            case 'PROFILE_LOAD_REQUEST':
                this.loadProfile(payload.userId);
                break;
            case 'PROFILE_UPDATE_DESCRIPTION_REQUEST':
                this.updateProfileDescription(payload.description);
                break;
            case 'SETTINGS_ACCOUNT_LOAD_REQUEST':
                this.loadSettingsAccount();
                break;
            case 'SETTINGS_ACCOUNT_UPDATE_REQUEST':
                this.updateSettingsAccount(payload.settings);
                break;
            case 'EDIT_PROFILE_UPDATE_REQUEST':
                this.updateSettingsAccount(payload.settings);
                break;
            case 'ACCOUNT_DELETE_REQUEST':
                this.deleteAccount();
                break;
            case 'CREATE_POST_REQUEST':
                this.createPost(payload);
                break;
            case 'POST_DELETE_REQUEST':
                this.deletePost(payload.postId);
                break;
            case 'POST_EDIT_REQUEST':
                this.loadPostForEdit(payload.postId);
                break;
            case 'EDIT_POST_REQUEST':
                this.editPost(payload.postId, payload);
                break;

            case 'AVATAR_UPLOAD_REQUEST':
                this.uploadAvatar(payload.file);
                break;
            case 'AVATAR_DELETE_REQUEST':
                this.deleteAvatar();
                break;
            case 'COVER_UPLOAD_REQUEST':
                this.uploadCover(payload.file);
                break;
            case 'COVER_DELETE_REQUEST':
                this.deleteCover();
                break;
        }
    }

    // отправ действие через диспетчер
    private sendAction(actionType: string, payload?: any): void {
        dispatcher.dispatch(actionType, payload);
    }

    /**
     * Нормализует данные поста, приводя их к единой структуре
     * Конвертирует PascalCase в camelCase и стандартизирует поля
     */
    private normalizePostData(post: any): any {
        return {
            id: post.id || post.ID,
            authorId: post.author_id || post.AuthorID,
            authorName: post.author_name || post.AuthorName,
            authorAvatar: post.author_avatar || post.AuthorAvatar,
            title: post.title || post.Title,
            content: post.content || post.Content,
            commentsCount: post.comments_count || post.CommentsCount || 0,
            repostsCount: post.reposts_count || post.RepostsCount || 0,
            viewsCount: post.views_count || post.ViewsCount || 0,
            theme: post.Topic?.Title || post.theme || 'Без темы',
            tags: []
        };
    }

    private async checkAuth(): Promise<void> {
        const response = await ajax.getMe();

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const userData = {
                        id: response.data.id,
                        name: response.data.name,
                        avatar: response.data.avatar || '/img/defaultAvatar.jpg',
                        subtitle: response.data.subtitle || 'Блог'
                    };
                    this.sendAction('USER_LOGIN_CHECKED', { user: userData });
                } else {
                    this.sendAction('USER_LOGIN_FAIL', { error: 'No user data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_LOGIN_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('USER_LOGIN_FAIL', { error: response.message || 'Auth check failed' });
        }
    }

    private async login(email: string, password: string): Promise<void> {
        const response = await ajax.login({ email, password });

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const userData = {
                        id: response.data.id,
                        name: response.data.name,
                        avatar: response.data.avatar || '/img/defaultAvatar.jpg',
                        subtitle: response.data.subtitle || 'Блог'
                    };
                    this.sendAction('USER_LOGIN_SUCCESS', { user: userData });
                } else {
                    this.sendAction('USER_LOGIN_FAIL', { error: 'No user data in response' });
                }
                break;
            case STATUS.unauthorized:
            case STATUS.badRequest:
            case STATUS.notFound:
                this.sendAction('USER_LOGIN_FAIL', { 
                    error: 'Email или пароль указаны неверно'
                });
                break;
            default:
                this.sendAction('USER_LOGIN_FAIL', { 
                    error: response.data?.error || response.message || 'Ошибка авторизации'
                });
        }
    }

    private async logout(): Promise<void> {
        const response = await ajax.logout();

        if (response.status === STATUS.ok) {
            this.sendAction('USER_LOGOUT');
        } else {
            this.sendAction('USER_LOGOUT_FAIL', { error: 'Logout failed' });
        }
    }

    private async editPost(postId: string, payload: any): Promise<void> {
        const response = await ajax.editPost(postId, {
            title: payload.title,
            content: payload.content,
            topic_id: payload.topic_id
        });

        if (response.status === 200) {
            this.sendAction('EDIT_POST_SUCCESS');
            this.sendAction('POSTS_RELOAD_AFTER_EDIT');
        } else {
            this.sendAction('EDIT_POST_FAIL', { 
                error: response.message || 'Не удалось сохранить пост' 
            });
        }
    }

    private async loadPostForEdit(postId: string): Promise<void> {
        const response = await ajax.get(`/post?id=${postId}`);
        if (response.status === 200 && response.data) {
            this.sendAction('POST_EDIT_LOAD_SUCCESS', { post: response.data });
        } else {
            this.sendAction('POST_EDIT_LOAD_FAIL', { error: 'Не удалось загрузить пост' });
        }
    }

    private async signUp(name: string, email: string, password: string): Promise<void> {
        const response = await ajax.register({ name, email, password });

        switch (response.status) {
            case STATUS.ok:
            case 201:
                this.sendAction('USER_SIGNUP_SUCCESS');
                break;
            case STATUS.conflict:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: 'Пользователь с таким email уже зарегистрирован'
                });
                break;
            case STATUS.badRequest:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: response.data?.globalError || response.message || 'Ошибка регистрации'
                });
                break;
            default:
                this.sendAction('USER_SIGNUP_FAIL', {
                    error: response.data?.globalError || response.message || 'Ошибка регистрации'
                });
        }
    }


    private async loadPosts(filter?: string, offset: number = 0): Promise<void> {
        let response;
        
        if (filter && filter !== 'fresh') {
            // Загрузка для категории (русские названия) - только для реальных категорий
            response = await ajax.get(`/feed/category?topic=${encodeURIComponent(filter)}&offset=${offset}`);
        } else {
            // Загрузка для свежего
            response = await ajax.get(`/feed?offset=${offset}`);
        }

        console.log('🔍 [API] Ответ от сервера:', response); // Добавьте для отладки

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    // Исправление: берем posts из response.data.articles, а не response.data
                    const postsArray = response.data.articles || response.data;
                    
                    // ИСПОЛЬЗУЕМ НОРМАЛИЗАЦИЮ
                    const postsWithAuthorId = postsArray.map((post: any) => this.normalizePostData(post));
                        
                    console.log('🔍 [API] Преобразованные посты:', postsWithAuthorId);
                    this.sendAction('POSTS_LOAD_SUCCESS', { posts: postsWithAuthorId });
                } else {
                    this.sendAction('POSTS_LOAD_FAIL', { error: 'No posts data' });
                }
                break;
            case STATUS.noMoreContent:
                this.sendAction('POSTS_LOAD_FAIL', { 
                    error: 'No more content'
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('POSTS_LOAD_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('POSTS_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки постов' 
                });
        }
    }

    private async loadPost(postId: string): Promise<void> {
        const response = await ajax.get(`/posts/${postId}`);

        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    this.sendAction('POST_LOAD_SUCCESS', { post: response.data });
                } else {
                    this.sendAction('POST_LOAD_FAIL', { error: 'Post data is empty' });
                }
                break;
            case STATUS.notFound:
                this.sendAction('POST_LOAD_FAIL', { error: 'Пост не найден' });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('POST_LOAD_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('POST_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки поста' 
                });
        }
    }

    private async loadUserPosts(userId: number): Promise<any[]> {
        let url = `/posts?author_id=${userId}`;
        
        const response = await ajax.get(url);
        if (response.status === STATUS.ok && response.data) {
            const postsArray = response.data.articles || response.data || [];
            
            // ИСПОЛЬЗУЕМ НОРМАЛИЗАЦИЮ
            return postsArray.map((post: any) => this.normalizePostData(post));
        }
        
        return [];
    }

    private async loadProfile(userId?: number): Promise<void> {
        let url = '/profile';
        
        if (userId) {
            url = `/profile?id=${userId}`;
        }
        
        const response = await ajax.get(url);
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const profileData = {
                        id: response.data.id,
                        name: response.data.name,
                        email: response.data.email,
                        avatar_url: response.data.avatar_url,
                        cover_url: response.data.cover_url,
                        description: response.data.description,
                        subscribers: response.data.subscribers || 0,
                        subscriptions: response.data.subscriptions || 0,
                        postsCount: response.data.posts_count || 0,
                        isSubscribed: response.data.is_subscribed || false
                    };

                    // Загружаем посты пользователя по его ID
                    const userPosts = await this.loadUserPosts(profileData.id); // ИСПОЛЬЗУЕМ profileData.id
                        
                    this.sendAction('PROFILE_LOAD_SUCCESS', {
                        profile: profileData,
                        posts: userPosts
                    });
                } else {
                    this.sendAction('PROFILE_LOAD_FAIL', { 
                        error: 'No profile data' 
                    });
                }
                break;
            case STATUS.notFound:
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: 'Профиль не найден' 
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: 'Not authenticated' 
                });
                break;
            default:
                this.sendAction('PROFILE_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки профиля' 
                });
        }
    }


    private async updateProfileDescription(description: string): Promise<void> {

        const currentProfileResponse = await ajax.get('/profile');
        
        if (currentProfileResponse.status !== STATUS.ok || !currentProfileResponse.data) {
            this.sendAction('PROFILE_UPDATE_DESCRIPTION_FAIL', { 
                error: 'Не удалось загрузить текущие данные профиля' 
            });
            return;
        }
        
        const currentData = currentProfileResponse.data;
        
        const updateData = {
            phone: currentData.phone || '',
            country: currentData.country || 'Россия',
            language: currentData.language || 'Русский',
            sex: currentData.sex || 'other',
            date_of_birth: currentData.date_of_birth || '',
            name: currentData.name || '',
            email: currentData.email || '',
            description: description
        };
        
        const response = await ajax.put('/profile', updateData);

        console.log('🔍 [API] Update profile response:', response);
        
        switch (response.status) {
            case STATUS.ok:
                console.log('🔍 [API] Description updated successfully');
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_SUCCESS', { 
                    description: description 
                });
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_FAIL', { 
                    error: 'Not authenticated' 
                });
                break;
            default:
                this.sendAction('PROFILE_UPDATE_DESCRIPTION_FAIL', { 
                    error: response.message || 'Ошибка обновления описания' 
                });
        }
    }
    //Сведения об аккаунте
    private async loadSettingsAccount(): Promise<void> {
        const response = await ajax.get('/profile');
        
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    const settingsData = {
                        phone: response.data.phone || '',
                        country: response.data.country || 'Россия',
                        language: response.data.language || 'Русский',
                        sex: response.data.sex || 'other',
                        date_of_birth: response.data.date_of_birth || '',
                        cover_url: response.data.cover_url,
                        name: response.data.name || '',
                        avatar_url: response.data.avatar_url,
                        email: response.data.email || '',
                        created_at: response.data.created_at || ''
                    };
                    this.sendAction('SETTINGS_ACCOUNT_LOAD_SUCCESS', { settings: settingsData });
                } else {
                    this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { error: 'No settings data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('SETTINGS_ACCOUNT_LOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки настроек' 
                });
        }
    }

    private async updateSettingsAccount(settings: any): Promise<void> {
        const response = await ajax.put('/profile', settings);
        
        switch (response.status) {
            case STATUS.ok:
                if (response.data) {
                    this.sendAction('SETTINGS_ACCOUNT_UPDATE_SUCCESS');
                    this.loadSettingsAccount();
                } else {
                    this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { error: 'No updated data' });
                }
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('SETTINGS_ACCOUNT_UPDATE_FAIL', { 
                    error: response.message || 'Ошибка обновления настроек' 
                });
        }
    }

    private async deleteAccount(): Promise<void> {
        const response = await ajax.deleteAccount();
        
        switch (response.status) {
            case STATUS.ok:
                this.sendAction('ACCOUNT_DELETE_SUCCESS');
                this.sendAction('USER_LOGOUT');
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('ACCOUNT_DELETE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('ACCOUNT_DELETE_FAIL', { 
                    error: response.message || 'Ошибка удаления аккаунта' 
                });
        }
    }
    
    private async createPost(payload: { title: string; content: string; topic_id: number }): Promise<void> {
    const response = await ajax.createPost(payload);

    switch (response.status) {
        case STATUS.ok:
        case 201:
            if (response.data) {
                this.sendAction('CREATE_POST_SUCCESS', response.data);
                
                this.sendAction('POSTS_RELOAD_AFTER_CREATE');
            } else {
                this.sendAction('CREATE_POST_FAIL', { 
                    error: 'Пост создан, но данные не возвращены' 
                });
            }
            break;
        case STATUS.badRequest:
            this.sendAction('CREATE_POST_FAIL', {
                error: response.data?.globalError || 
                       response.data?.message || 
                       'Некорректные данные поста'
            });
            break;
        case STATUS.unauthorized:
            this.sendAction('USER_UNAUTHORIZED');
            this.sendAction('CREATE_POST_FAIL', { 
                error: 'Требуется авторизация для создания постов' 
            });
            break;
        default:
            this.sendAction('CREATE_POST_FAIL', {
                error: response.message || 'Не удалось создать пост'
            });
        }
    }

    private async deletePost(postId: string): Promise<void> {
        const response = await ajax.deletePost(`/${postId}`);
        if (response.status === 200) {
            this.sendAction('POST_DELETE_SUCCESS', { postId });
            this.sendAction('POSTS_RELOAD_AFTER_DELETE');
        } else {
            this.sendAction('POST_DELETE_FAIL', { error: 'Не удалось удалить пост' });
        }
    }

    private async uploadAvatar(file: File): Promise<void> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await ajax.uploadAvatar(formData);

        switch (response.status) {
            case STATUS.ok:
                this.sendAction('AVATAR_UPLOAD_SUCCESS');
                this.loadSettingsAccount();
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('AVATAR_UPLOAD_FAIL', { error: 'Not authenticated' });
                break;
            case STATUS.badRequest:
                this.sendAction('AVATAR_UPLOAD_FAIL', { 
                    error: response.data?.error || 'Неверный формат файла' 
                });
                break;
            default:
                this.sendAction('AVATAR_UPLOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки аватара' 
                });
        }
    }

    private async deleteAvatar(): Promise<void> {
        const response = await ajax.deleteAvatar();

        switch (response.status) {
            case STATUS.ok:
                this.sendAction('AVATAR_DELETE_SUCCESS');
                this.loadSettingsAccount();
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('AVATAR_DELETE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('AVATAR_DELETE_FAIL', { 
                    error: response.message || 'Ошибка удаления аватара' 
                });
        }
    }

    private async uploadCover(file: File): Promise<void> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await ajax.uploadCover(formData);

        switch (response.status) {
            case STATUS.ok:
                this.sendAction('COVER_UPLOAD_SUCCESS');
                this.loadSettingsAccount();
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('COVER_UPLOAD_FAIL', { error: 'Not authenticated' });
                break;
            case STATUS.badRequest:
                this.sendAction('COVER_UPLOAD_FAIL', { 
                    error: response.data?.error || 'Неверный формат файла' 
                });
                break;
            default:
                this.sendAction('COVER_UPLOAD_FAIL', { 
                    error: response.message || 'Ошибка загрузки обложки' 
                });
        }
    }

    private async deleteCover(): Promise<void> {
        const response = await ajax.deleteCover();

        switch (response.status) {
            case STATUS.ok:
                this.sendAction('COVER_DELETE_SUCCESS');
                this.loadSettingsAccount();
                break;
            case STATUS.unauthorized:
                this.sendAction('USER_UNAUTHORIZED');
                this.sendAction('COVER_DELETE_FAIL', { error: 'Not authenticated' });
                break;
            default:
                this.sendAction('COVER_DELETE_FAIL', { 
                    error: response.message || 'Ошибка удаления обложки' 
                });
        }
    }
}

// cозд и экспорт единственный экземпляр
export const api = new API();
export default api;