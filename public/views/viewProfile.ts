import { Profile } from '../components/Profile/Profile';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';
import { profileStore } from '../stores/storeProfile';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { router } from '../router/router';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { CreatePostFormView } from '../views/viewCreatePostForm'; // ДОБАВЛЯЕМ ИМПОРТ

export class ProfileView {
    private container: HTMLElement;
    private userId?: string;
    private boundStoreHandler: () => void;
    private boundLoginStoreHandler: () => void;
    private topBloggers: TopBloggers | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private createPostFormView: CreatePostFormView | null = null; // ДОБАВЛЯЕМ

    constructor(container: HTMLElement, params?: any) {
        this.container = container;
        this.headerInstance = new Header();
        this.createPostFormView = new CreatePostFormView(); // ИНИЦИАЛИЗИРУЕМ
        
        
        // Получаем userId из параметров маршрута или query строки
        if (params && params.id) {
            this.userId = params.id;
        } else if (params && params.query && params.query.id) {
            this.userId = params.query.id;
        } else {
            // Если нет ID, загружаем текущего пользователя
        }
        
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
        await this.renderFullPage();
        
        profileStore.addListener(this.boundStoreHandler);
        loginStore.addListener(this.boundLoginStoreHandler);
        
        // Всегда передаем userId, даже если undefined (тогда API вернет текущего пользователя)
        dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
            userId: this.userId 
        });

        return this.pageWrapper!;
    }

    private async renderFullPage(): Promise<void> {
        this.container.innerHTML = '';

        this.pageWrapper = document.createElement('div');
        
        // Header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        this.pageWrapper.appendChild(headerContainer);

        // Основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        
        // Левое меню — ДВА сайдбара
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        // Сохраняем ссылки на DOM-элементы сайдбаров
        let sidebarEl1: HTMLElement | null = null;
        let sidebarEl2: HTMLElement | null = null;

        // Функция для сброса активности
        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // левое меню
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            'fresh',
            (key) => {
                if (sidebarEl2) deactivateAll(sidebarEl2);
                dispatcher.dispatch('POSTS_SET_FILTER', { filter: key });
            }
        );
        sidebarEl1 = await sidebar1.render();

        // Нижнее меню
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (key) => {
                if (sidebarEl1) deactivateAll(sidebarEl1);
                dispatcher.dispatch('POSTS_SET_FILTER', { filter: key });
            }
        );
        sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // Центральная область с профилем
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        const profileContent = await this.renderProfileContent();
        mainContent.appendChild(profileContent);

        // Правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';
        this.topBloggers = new TopBloggers();
        const bloggersElement = await this.topBloggers.render();
        rightMenu.appendChild(bloggersElement);

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(rightMenu);
        
        this.pageWrapper.appendChild(contentContainer);
        this.container.appendChild(this.pageWrapper);
    }

    private async renderProfileContent(): Promise<HTMLElement> {
        const state = profileStore.getState();
        const loginState = loginStore.getState();
        
        // ПРАВИЛЬНОЕ определение isMyProfile
        let isMyProfile = false;
        
        if (this.userId) {
            // Если передан конкретный userId, сравниваем с текущим пользователем
            isMyProfile = loginState.user?.id?.toString() === this.userId.toString();
        } else {
            // Если userId не передан, значит это профиль текущего пользователя
            isMyProfile = true;
        }
        

        const profileComponent = new Profile({
            profile: state.profile,
            posts: state.posts,
            activeTab: state.activeTab,
            isLoading: state.isLoading,
            error: state.error,
            isEditingDescription: state.isEditingDescription,
            isMyProfile: isMyProfile // Передаем правильное значение
        });

        const profileElement = await profileComponent.render();
        this.attachEventListeners(profileElement);
        
        return profileElement;
    }

    private handleStoreChange(): void {
        const mainContent = this.container.querySelector('.main-content');
        if (mainContent) {
            this.renderProfileContent().then(newContent => {
                mainContent.innerHTML = '';
                mainContent.appendChild(newContent);
            });
        }
    }

    private handleLoginStoreChange(): void {
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    private attachEventListeners(container: HTMLElement): void {
        const tabButtons = container.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = (e.target as HTMLElement).dataset.tab;
                if (tab === 'posts' || tab === 'comments') {
                    dispatcher.dispatch('PROFILE_CHANGE_TAB', { tab });
                }
            });
        });

        this.attachDescriptionEventListeners(container);
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
        dispatcher.dispatch('PROFILE_START_EDIT_DESCRIPTION');
    }

    private saveDescription(description: string): void {
        dispatcher.dispatch('PROFILE_UPDATE_DESCRIPTION_REQUEST', {
            description: description.trim()
        });
    }

    destroy(): void {
        profileStore.removeListener(this.boundStoreHandler);
        loginStore.removeListener(this.boundLoginStoreHandler);
        this.headerInstance.destroy();
        // ДОБАВЛЯЕМ уничтожение CreatePostFormView
        if (this.createPostFormView) {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
    }
}