import { SettingsNotifications } from '../components/SettingsNotifications/SettingsNotifications';
import { SidebarMenu } from '../components/SidebarMenu/SidebarMenu';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';

export class SettingsNotificationsView {
    private container: HTMLElement;
    private sidebarMenu: SidebarMenu | null = null;
    private topBloggers: TopBloggers | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
    }

    async render(): Promise<HTMLElement> {
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

        // Центральная область
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const notificationsContent = await this.renderNotificationsContent();
        mainContent.appendChild(notificationsContent);

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

    private async renderNotificationsContent(): Promise<HTMLElement> {
        const settingsNotificationsComponent = new SettingsNotifications({});
        return await settingsNotificationsComponent.render();
    }

    destroy(): void {
        this.headerInstance.destroy();
    }
}