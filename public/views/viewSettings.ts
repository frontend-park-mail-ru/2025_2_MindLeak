import { Settings } from '../components/Settings/Settings';
import { SidebarMenu } from '../components/SidebarMenu/SidebarMenu';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';
import { router } from '../router/router';
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
        
        // Левое меню
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';
        this.sidebarMenu = new SidebarMenu();
        const sidebarElement = await this.sidebarMenu.render();
        leftMenu.appendChild(sidebarElement);

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