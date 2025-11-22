import { Profile } from '../components/Profile/Profile';
import { UserList } from '../components/UserList/UserList';
import { Header } from '../components/Header/Header';
import { profileStore } from '../stores/storeProfile';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { router } from '../router/router';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { CreatePostFormView } from '../views/viewCreatePostForm';

export class ProfileView {
    private currentCategory: string = '';
    private container: HTMLElement;
    private userId?: string;
    private boundStoreHandler: () => void;
    private boundLoginStoreHandler: () => void;
    private userList: UserList | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private createPostFormView: CreatePostFormView | null = null;
    private hasRendered: boolean = false;
    private sidebarEl1: HTMLElement | null = null;
    private sidebarEl2: HTMLElement | null = null;
    private isDestroyed: boolean = false; // Флаг для отслеживания уничтожения

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
    }

    async render(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            console.warn('⚠️ [PROFILE] Attempted to render destroyed view');
            return document.createElement('div'); // Возвращаем пустой элемент
        }

        window.scrollTo(0, 0);
        
        // Если уже отрендерено, возвращаем существующий wrapper
        if (this.hasRendered && this.pageWrapper) {
            return this.pageWrapper;
        }

        // Очищаем контейнер
        this.container.innerHTML = '';
        
        // Создаем основной wrapper ДО вызова renderPageLayout
        this.pageWrapper = document.createElement('div');
        
        try {
            // Рендерим базовую структуру страницы
            await this.renderPageLayout();
            
            // Добавляем слушатели
            profileStore.addListener(this.boundStoreHandler);
            loginStore.addListener(this.boundLoginStoreHandler);
            
            // Загружаем данные профиля
            dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                userId: this.userId 
            });

            this.hasRendered = true;
            
            // Добавляем в контейнер
            this.container.appendChild(this.pageWrapper);
            return this.pageWrapper;
        } catch (error) {
            console.error('❌ [PROFILE] Error rendering profile:', error);
            // В случае ошибки возвращаем пустой элемент
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Ошибка загрузки профиля';
            return errorDiv;
        }
    }

    private async renderPageLayout(): Promise<void> {
        // Убеждаемся, что pageWrapper существует и view не уничтожен
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

        // Создаем сайдбары
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            '',
            (key) => {
                dispatcher.dispatch('POSTS_SET_FILTER', { filter: key });
            }
        );

        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (key) => {
                dispatcher.dispatch('POSTS_SET_FILTER', { filter: key });
            }
        );

        this.sidebarEl1 = await sidebar1.render();
        this.sidebarEl2 = await sidebar2.render();

        if (this.sidebarEl1) leftMenu.appendChild(this.sidebarEl1);
        if (this.sidebarEl2) leftMenu.appendChild(this.sidebarEl2);

        // Центральная область
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        // Инициализируем с загрузочным состоянием
        const loadingContent = await this.renderProfileContent();
        if (loadingContent) {
            mainContent.appendChild(loadingContent);
        }

        // Правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';
        
        this.userList = new UserList({
            title: 'Топ блогов',
            users: []
            });
        const bloggersElement = await this.userList.render();
        if (bloggersElement) {
            rightMenu.appendChild(bloggersElement);
        }

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(rightMenu);
        
        this.pageWrapper.appendChild(contentContainer);
    }

    private async renderProfileContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const state = profileStore.getState();
        const loginState = loginStore.getState();
        
        // Если данные еще не загружены, показываем скелетон
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

        // ПРАВИЛЬНОЕ определение isMyProfile
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
        
        // Если данные загружены (успешно или с ошибкой), обновляем контент
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
        
        // Уничтожаем только те компоненты, у которых есть метод destroy
        if (this.headerInstance && typeof this.headerInstance.destroy === 'function') {
            this.headerInstance.destroy();
        }
        
        if (this.createPostFormView && typeof this.createPostFormView.destroy === 'function') {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
        
        // Очищаем ссылки на DOM элементы
        this.sidebarEl1 = null;
        this.sidebarEl2 = null;
        this.userList = null;
        
        // Удаляем pageWrapper из DOM
        if (this.pageWrapper && this.pageWrapper.parentNode) {
            this.pageWrapper.parentNode.removeChild(this.pageWrapper);
        }
        
        this.pageWrapper = null;
        this.hasRendered = false;
    }
}