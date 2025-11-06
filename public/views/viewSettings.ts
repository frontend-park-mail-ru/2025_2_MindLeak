import { Settings } from '../components/Settings/Settings';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';
import { router } from '../router/router';
import { dispatcher } from '../dispatcher/dispatcher';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { loginStore } from '../stores/storeLogin';


export class SettingsView {
    private container: HTMLElement;
    private sidebarMenu: SidebarMenu | null = null;
    private topBloggers: TopBloggers | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private boundLoginStoreHandler: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
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

        // Левое меню
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            'fresh',
            (key) => {
            if (sidebarEl2) deactivateAll(sidebarEl2);
            
            const newUrl = key === 'fresh' ? '/feed' : `/feed?filter=${encodeURIComponent(key)}`;
            window.history.pushState({}, '', newUrl);
            
            window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        sidebarEl1 = await sidebar1.render();
        
        // Нижнее меню
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (key) => {
            if (sidebarEl2) deactivateAll(sidebarEl2);
            
            const newUrl = key === '' ? '/feed' : `/feed?filter=${encodeURIComponent(key)}`;
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
        this.topBloggers = new TopBloggers();
        const bloggersElement = await this.topBloggers.render();
        rightMenu.appendChild(bloggersElement);

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(mainContent);
        contentContainer.appendChild(rightMenu);
        
        this.pageWrapper.appendChild(contentContainer);
        this.container.appendChild(this.pageWrapper);
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

    private handleLoginStoreChange(): void {
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    destroy(): void {
        loginStore.removeListener(this.boundLoginStoreHandler);
        this.headerInstance.destroy();
    }
}