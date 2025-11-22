import { SettingsPrivacy } from '../components/SettingsPrivacy/SettingsPrivacy';
import { UserList } from '../components/UserList/UserList';
import { Header } from '../components/Header/Header';
import { dispatcher } from '../dispatcher/dispatcher';
import { userListStore } from '../stores/storeUserList';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';

export class SettingsPrivacyView {
    private container: HTMLElement;
    private sidebarMenu: SidebarMenu | null = null;
    private userList: UserList | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private boundStoreHandler: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
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
            '',
            (key) => {

            const newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
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
            
            const newUrl = key === '' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
            window.history.pushState({}, '', newUrl);
            
            window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        
        sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // Центральная область
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const privacyContent = await this.renderPrivacyContent();
        mainContent.appendChild(privacyContent);

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

    private async renderPrivacyContent(): Promise<HTMLElement> {
        const settingsPrivacyComponent = new SettingsPrivacy({});
        return await settingsPrivacyComponent.render();
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

    destroy(): void {
        userListStore.removeListener(this.boundStoreHandler);
        this.headerInstance.destroy();
    }
}
