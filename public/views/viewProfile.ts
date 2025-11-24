import { Profile } from '../components/Profile/Profile';
import { UserList } from '../components/UserList/UserList';
import { Header } from '../components/Header/Header';
import { profileStore } from '../stores/storeProfile';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { router } from '../router/router';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { CreatePostFormView } from '../views/viewCreatePostForm';
import { userListStore } from '../stores/storeUserList';

export class ProfileView {
    private currentCategory: string = '';
    private container: HTMLElement;
    private userId?: string;
    private boundStoreHandler: () => void;
    private boundLoginStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;
    private userList: UserList | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private createPostFormView: CreatePostFormView | null = null;
    private hasRendered: boolean = false;
    private sidebarEl1: HTMLElement | null = null;
    private sidebarEl2: HTMLElement | null = null;
    private isDestroyed: boolean = false;
    private userListElement: HTMLElement | null = null;
    private isUserListRendered: boolean = false; // Добавляем флаг

    constructor(container: HTMLElement, params?: any) {
        this.container = container;
        this.headerInstance = new Header();
        this.createPostFormView = new CreatePostFormView();
        
        if (params && params.id) {
            this.userId = params.id;
        } else if (params && params.query && params.query.id) {
            this.userId = params.query.id;
        }
        
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
        this.determineCurrentCategory();
    }

    private determineCurrentCategory(): void {
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        
        if (pathname === '/' || pathname === '/feed') {
            this.currentCategory = 'fresh';
        } else if (pathname === '/feed/category') {
            const topicParam = url.searchParams.get('topic');
            this.currentCategory = topicParam || 'fresh';
        }
        
        dispatcher.dispatch('POSTS_SET_FILTER', { filter: this.currentCategory });
    }

    async render(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            console.warn('⚠️ [PROFILE] Attempted to render destroyed view');
            return document.createElement('div');
        }

        window.scrollTo(0, 0);
        
        this.determineCurrentCategory();
        
        if (this.hasRendered && this.pageWrapper) {
            return this.pageWrapper;
        }

        this.container.innerHTML = '';
        
        this.pageWrapper = document.createElement('div');
        
        try {
            await this.renderPageLayout();
            
            profileStore.addListener(this.boundStoreHandler);
            loginStore.addListener(this.boundLoginStoreHandler);
            userListStore.addListener(this.boundUserListStoreHandler);
            
            dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                userId: this.userId 
            });

            // Загружаем топ блогов только если еще не загружали
            if (!this.isUserListRendered) {
                dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
                this.isUserListRendered = true;
            }

            this.hasRendered = true;
            
            this.container.appendChild(this.pageWrapper);
            return this.pageWrapper;
        } catch (error) {
            console.error('❌ [PROFILE] Error rendering profile:', error);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Ошибка загрузки профиля';
            return errorDiv;
        }
    }

    private async renderPageLayout(): Promise<void> {
        if (!this.pageWrapper || this.isDestroyed) {
            console.error('❌ [PROFILE] pageWrapper is null or view destroyed in renderPageLayout');
            return;
        }

        // Header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        if (headerEl) {
            headerContainer.appendChild(headerEl);
            this.pageWrapper.appendChild(headerContainer);
        }

        // Основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        
        // Левое меню
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (this.sidebarEl2) this.deactivateAll(this.sidebarEl2);
                
                let newUrl = '';
                if (key === 'fresh') {
                    newUrl = '/feed';
                } else {
                    newUrl = `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                }
                
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );

        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (this.sidebarEl1) this.deactivateAll(this.sidebarEl1);
                
                let newUrl = '';
                if (key === 'fresh') {
                    newUrl = '/feed';
                } else {
                    newUrl = `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                }
                
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );

        this.sidebarEl1 = await sidebar1.render();
        this.sidebarEl2 = await sidebar2.render();

        if (this.sidebarEl1) leftMenu.appendChild(this.sidebarEl1);
        if (this.sidebarEl2) leftMenu.appendChild(this.sidebarEl2);

        // Центральная область
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const loadingContent = await this.renderProfileContent();
        if (loadingContent) {
            mainContent.appendChild(loadingContent);
        }

        // Правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';
        
        // Инициализируем UserList с пустыми данными
        this.userList = new UserList({
            title: 'Топ блогов',
            users: []
        });
        const bloggersElement = await this.userList.render();
        if (bloggersElement) {
            this.userListElement = bloggersElement;
            rightMenu.appendChild(bloggersElement);
        }

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(rightMenu);
        
        this.pageWrapper.appendChild(contentContainer);
    }

    private deactivateAll(sidebarEl: HTMLElement): void {
        sidebarEl.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('menu-item--active');
        });
    }

    private async renderProfileContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const state = profileStore.getState();
        const loginState = loginStore.getState();
        
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

        const profileComponent = new Profile({
            profile: state.profile,
            posts: state.posts,
            activeTab: state.activeTab,
            isLoading: state.isLoading,
            error: state.error,
            isEditingDescription: state.isEditingDescription,
            isMyProfile: isMyProfile
        });

        const profileElement = await profileComponent.render();
        this.attachEventListeners(profileElement);
        
        return profileElement;
    }

    private handleStoreChange(): void {
        if (this.isDestroyed) return;

        const state = profileStore.getState();
        console.log('🔄 [PROFILE] Store changed:', { 
            isLoading: state.isLoading, 
            postsCount: state.posts?.length,
            hasProfile: !!state.profile
        });
        
        if (!state.isLoading) {
            const mainContent = this.container.querySelector('.main-content');
            if (mainContent) {
                this.renderProfileContent().then(newContent => {
                    if (!this.isDestroyed && newContent) {
                        mainContent.innerHTML = '';
                        mainContent.appendChild(newContent);
                    }
                });
            }
        }
    }

    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;

        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        if (this.isDestroyed) return;
        
        const rightMenu = this.pageWrapper?.querySelector('.sidebar-right') || 
                         document.querySelector('.sidebar-right');
        
        if (!rightMenu) return;

        // Удаляем старый UserList если он есть
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }

        const state = userListStore.getState();
        // Рендерим только если есть пользователи
        if (state.users && state.users.length > 0) {
            const newList = new UserList({
                title: 'Топ блогов',
                users: state.users || []
            });
            
            this.userListElement = await newList.render();
            rightMenu.appendChild(this.userListElement);
        }
    }

    private handleLoginStoreChange(): void {
        if (this.isDestroyed) return;

        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    private attachEventListeners(container: HTMLElement): void {
        if (this.isDestroyed) return;

        const tabButtons = container.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = (e.target as HTMLElement).dataset.tab;
                if (tab === 'posts' || tab === 'comments') {
                    dispatcher.dispatch('PROFILE_CHANGE_TAB', { tab });
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
        
        profileStore.removeListener(this.boundStoreHandler);
        loginStore.removeListener(this.boundLoginStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        if (this.headerInstance && typeof this.headerInstance.destroy === 'function') {
            this.headerInstance.destroy();
        }
        
        if (this.createPostFormView && typeof this.createPostFormView.destroy === 'function') {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
        
        // Очищаем UserList
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }
        
        // Сбрасываем флаги
        this.isUserListRendered = false;
        this.hasRendered = false;
        
        this.sidebarEl1 = null;
        this.sidebarEl2 = null;
        this.userList = null;
        
        if (this.pageWrapper && this.pageWrapper.parentNode) {
            this.pageWrapper.parentNode.removeChild(this.pageWrapper);
        }
        
        this.pageWrapper = null;
    }
}