// views/viewSettings.ts
import { BaseView } from './viewBase';
import { Settings } from '../components/Settings/Settings';
import { router } from '../router/router';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList';

export class SettingsView extends BaseView {
    private container: HTMLElement;
    private boundLoginStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;

    constructor(container: HTMLElement) {
        super();
        this.container = container;
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    /**
     * Переопределяем определение категории для главной страницы настроек
     */
    protected determineCurrentCategory(): void {
        // Для страницы настроек устанавливаем пустую категорию,
        // чтобы ни один пункт меню не был активным
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        
        // Подписываемся на stores
        loginStore.addListener(this.boundLoginStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // Рендерим базовую структуру
        await this.renderPageLayout();
        
        // Добавляем контент в container
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const settingsContent = await this.renderSettingsMain();
        mainContent.appendChild(settingsContent);
        return mainContent;
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
        if (this.isDestroyed) return;
        
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
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

    destroy(): void {
        this.isDestroyed = true;
        
        loginStore.removeListener(this.boundLoginStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        super.destroy();
        
        // Удаляем из container
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}