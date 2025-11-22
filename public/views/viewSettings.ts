import { Settings } from '../components/Settings/Settings';
import { UserList } from '../components/UserList/UserList';
import { Header } from '../components/Header/Header';
import { router } from '../router/router';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList';
import { dispatcher } from '../dispatcher/dispatcher';

export class SettingsView {
    private container: HTMLElement;
    private userList: UserList | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private currentCategory: string = '';
    private boundLoginStoreHandler: () => void;
    private boundStoreHandler: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundStoreHandler = this.handleStoreChange.bind(this);
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

    }

    async render(): Promise<HTMLElement> {
        this.determineCurrentCategory();
        loginStore.addListener(this.boundLoginStoreHandler);
        await this.renderFullPage();
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

        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';
        
        // Сохраняем ссылки на DOM-элементы сайдбаров
        let sidebarEl1: HTMLElement | null = null;
        let sidebarEl2: HTMLElement | null = null;

        // Функция для сброса активности в сайдбаре
        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // левое меню
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl2) deactivateAll(sidebarEl2);
                
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
        sidebarEl1 = await sidebar1.render();

        // нижнее меню
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl1) deactivateAll(sidebarEl1);
                
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
        sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // Центральная область с настройками
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const settingsContent = await this.renderSettingsMain();
        mainContent.appendChild(settingsContent);

        // Правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(rightMenu);
        
        this.pageWrapper.appendChild(contentContainer);
        this.container.appendChild(this.pageWrapper);

        // Подписываемся и запускаем загрузку топ-блогеров
        userListStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
    }

    private async renderSettingsMain(): Promise<HTMLElement> {
        const settingsMainComponent = new Settings({});
        const settingsMainElement = await settingsMainComponent.render();
        this.attachEventListeners(settingsMainElement);
        
        return settingsMainElement;
    }

    private attachEventListeners(container: HTMLElement): void {
        const navItems = container.querySelectorAll('.settings-main__nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const route = (item as HTMLElement).dataset.route;
                if (route) {
                    router.navigate(route);
                }
            });
        });
    }

    private handleStoreChange(): void {
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        const rightMenu = this.pageWrapper?.querySelector('.sidebar-right') || document.querySelector('.sidebar-right');
        if (!rightMenu) return;

        const oldContent = rightMenu.querySelector('.user-list');
        if (oldContent) oldContent.remove();

        const newList = new UserList({
            title: 'Топ блогов',
            users: userListStore.getState().users || []
        });
        const newElement = await newList.render();
        rightMenu.appendChild(newElement);
    }

    private handleLoginStoreChange(): void {
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    destroy(): void {
        userListStore.removeListener(this.boundStoreHandler);
        loginStore.removeListener(this.boundLoginStoreHandler);
        this.headerInstance.destroy();
    }
}
