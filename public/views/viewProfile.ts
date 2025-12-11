import { BaseView } from './viewBase';
import { Profile } from '../components/Profile/Profile';
import { profileStore } from '../stores/storeProfile';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList';
import { router } from '../router/router';
import { CreatePostFormView } from '../views/viewCreatePostForm';
import { HashtagParser } from '../utils/hashtagParser';
import { OfflineWarning } from '../components/OfflineWarning/OfflineWarning';

export class ProfileView extends BaseView {
    private container: HTMLElement;
    private userId?: string;
    private boundProfileStoreHandler: () => void;
    private boundLoginStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;
    private createPostFormView: CreatePostFormView | null = null;
    private hasRendered: boolean = false;

    constructor(container: HTMLElement, params?: any) {
        super();
        this.container = container;
        this.createPostFormView = new CreatePostFormView();
        
        if (params && params.id) {
            this.userId = params.id;
        } else if (params && params.query && params.query.id) {
            this.userId = params.query.id;
        }
        
        this.boundProfileStoreHandler = this.handleProfileStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    protected determineCurrentCategory(): void {
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            console.warn('⚠️ [PROFILE] Attempted to render destroyed view');
            return document.createElement('div');
        }

        window.scrollTo(0, 0);
        
        if (this.hasRendered && this.rootElement) {
            return this.rootElement;
        }

        // Подписываемся на stores
        profileStore.addListener(this.boundProfileStoreHandler);
        loginStore.addListener(this.boundLoginStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // Рендерим базовую структуру
        await this.renderPageLayout();
        
        // Загружаем данные профиля
        dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
            userId: this.userId 
        });

        // Инициализируем UserList (вызовется автоматически из BaseView.renderPageLayout)
        // или явно если нужно:
        await this.initUserList();

        // Добавляем контент в container
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }

        this.hasRendered = true;
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const profileContent = await this.renderProfileContent();
        mainContent.appendChild(profileContent);
        return mainContent;
    }

    private async renderProfileContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const state = profileStore.getState();
        const loginState = loginStore.getState();

        if (state.isOffline || (state.error && (
            state.error.includes('оффлайн') || 
            state.error.includes('408') || 
            state.error.includes('Failed to fetch')
        ))) {
            
            const params = new URLSearchParams(window.location.search);
            const requestedId = params.get('id') || state.requestedId || 'неизвестный';
            
            const offlineWarning = new OfflineWarning({
                title: 'Профиль недоступен оффлайн',
                message: 'Этот профиль не был сохранён для просмотра без интернета.',
                requestedId: requestedId,
                onReload: () => {
                    // Сбрасываем оффлайн состояние перед повторной попыткой
                    dispatcher.dispatch('PROFILE_RESET_OFFLINE');
                    dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                        userId: this.userId 
                    });
                },
                onBack: () => {
                    history.back();
                }
            });
            
            return await offlineWarning.render();
        }
        
        if (state.isLoading || !state.profile) {
            const skeleton = document.createElement('div');
            skeleton.className = 'profile';
            skeleton.innerHTML = `
                <div class="profile__loading">
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 18px; margin-bottom: 20px;">Загрузка профиля...</div>
                        <div style="display: inline-block; width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                </div>
            `;
            return skeleton;
        }

        let isMyProfile = false;
        
        if (this.userId) {
            isMyProfile = loginState.user?.id?.toString() === this.userId.toString();
        } else {
            isMyProfile = true;
        }

        // Обрабатываем хештеги в постах перед передачей в компонент Profile
        const postsWithHashtags = state.posts ? state.posts.map(post => ({
            ...post,
            title: HashtagParser.replaceHashtagsWithLinks(post.title || ''),
            content: HashtagParser.replaceHashtagsWithLinks(post.content || '')
        })) : [];

        const profileComponent = new Profile({
            profile: state.profile,
            comments: state.comments,
            posts: postsWithHashtags, // Используем посты с обработанными хештегами
            activeTab: state.activeTab,
            isLoading: state.isLoading,
            error: state.error,
            isEditingDescription: state.isEditingDescription,
            isMyProfile: isMyProfile
        });

        const profileElement = await profileComponent.render();
        this.attachEventListeners(profileElement);
        this.setupHashtagHandlers(profileElement); // Добавляем обработчики для хештегов
        
        return profileElement;
    }

    private setupHashtagHandlers(container: HTMLElement): void {
        const hashtagLinks = container.querySelectorAll('.hashtag-link');
        
        hashtagLinks.forEach(link => {
            link.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                const hashtag = link.getAttribute('data-hashtag');
                if (hashtag) {
                    this.handleHashtagClick(hashtag);
                }
            });
        });
    }

    private handleHashtagClick(hashtag: string): void {
        // Навигация на страницу поиска с хештегом
        router.navigate(`/search?q=%23${encodeURIComponent(hashtag)}`);
    }

    private handleProfileStoreChange(): void {
        if (this.isDestroyed) return;

        const state = profileStore.getState();
        console.log('🔄 [PROFILE] Store changed:', { 
            isLoading: state.isLoading, 
            postsCount: state.posts?.length,
            hasProfile: !!state.profile
        });
        
        if (!state.isLoading && this.mainContent) {
            this.renderProfileContent().then(newContent => {
                if (!this.isDestroyed && newContent && this.mainContent) {
                    this.mainContent.innerHTML = '';
                    this.mainContent.appendChild(newContent);
                }
            });
        }
    }

    private handleLoginStoreChange(): void {
        if (this.isDestroyed) return;

        const loginState = loginStore.getState();
        const profileState = profileStore.getState();
        
        // ИЗМЕНЕНИЕ: Сравниваем базовые URL
        const getBaseUrl = (url: string | undefined) => {
            if (!url) return '';
            return url.split('?')[0];
        };
        
        const loginAvatarBase = getBaseUrl(loginState.user?.avatar);
        const profileAvatarBase = getBaseUrl(profileState.profile?.avatar_url);
        
        console.log('🔄 ProfileView: Avatar comparison:', {
            loginAvatarBase,
            profileAvatarBase
        });
        
        if (loginAvatarBase && profileAvatarBase && loginAvatarBase !== profileAvatarBase) {
            console.log('🖼️ Avatar changed! Updating profile view...');
            
            // Если это профиль текущего пользователя, перезагружаем данные
            if (!this.userId || loginState.user?.id.toString() === this.userId.toString()) {
                console.log('🔄 This is my profile, reloading...');
                dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                    userId: this.userId 
                });
            }
        }
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    //обработчик изменений userListStore
    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        // Используем метод из BaseView
        this.updateUserListContent();
    }

    private attachEventListeners(container: HTMLElement): void {
        if (this.isDestroyed) return;

        const tabButtons = container.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = (e.target as HTMLElement).dataset.tab;
                if (tab === 'posts' || tab === 'comments') {
                    dispatcher.dispatch('PROFILE_CHANGE_TAB', { tab });
                    if (tab === 'comments') {
                        const state = profileStore.getState();
                        if (state.comments.length === 0 && state.profile) {
                            dispatcher.dispatch('PROFILE_LOAD_COMMENTS_REQUEST', { userId: state.profile.id });
                        }
                    }
                }
            });
        });

        this.attachPostEditListeners(container);
        this.attachDescriptionEventListeners(container);
    }

    private attachPostEditListeners(container: HTMLElement): void {
        const menuButtons = container.querySelectorAll('.post-card__menu-button');
        menuButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    private attachDescriptionEventListeners(container: HTMLElement): void {
        const editButton = container.querySelector('.profile__edit-btn');
        if (editButton) {
            editButton.addEventListener('click', () => {
                this.startEditingDescription();
            });
        }

        const placeholder = container.querySelector('.profile__description-placeholder');
        if (placeholder) {
            placeholder.addEventListener('click', () => {
                this.startEditingDescription();
            });
        }

        const descriptionInput = container.querySelector('.form__input[name="description"]');
        if (descriptionInput) {
            descriptionInput.addEventListener('keydown', (e: Event) => {
                const keyboardEvent = e as KeyboardEvent;
                if (keyboardEvent.key === 'Enter') {
                    this.saveDescription((keyboardEvent.target as HTMLInputElement).value);
                }
            });

            descriptionInput.addEventListener('blur', (e: Event) => {
                this.saveDescription((e.target as HTMLInputElement).value);
            });

            (descriptionInput as HTMLInputElement).focus();
            (descriptionInput as HTMLInputElement).select();
        }
    }

    private startEditingDescription(): void {
        if (this.isDestroyed) return;
        dispatcher.dispatch('PROFILE_START_EDIT_DESCRIPTION');
    }

    private saveDescription(description: string): void {
        if (this.isDestroyed) return;
        dispatcher.dispatch('PROFILE_UPDATE_DESCRIPTION_REQUEST', {
            description: description.trim()
        });
    }

    destroy(): void {
        this.isDestroyed = true;
        
        profileStore.removeListener(this.boundProfileStoreHandler);
        loginStore.removeListener(this.boundLoginStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        if (this.createPostFormView && typeof this.createPostFormView.destroy === 'function') {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
        
        super.destroy();
        
        // Удаляем из container
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}