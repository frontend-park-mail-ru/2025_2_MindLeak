import { BaseView } from './viewBase';
import { SettingsNotifications } from '../components/SettingsNotifications/SettingsNotifications';
import { userListStore } from '../stores/storeUserList';

export class SettingsNotificationsView extends BaseView {
    private container: HTMLElement;
    private boundUserListStoreHandler: () => void;

    constructor(container: HTMLElement) {
        super();
        this.container = container;
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    protected determineCurrentCategory(): void {
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        
        userListStore.addListener(this.boundUserListStoreHandler);
        await this.renderPageLayout();
        
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const notificationsContent = await this.renderNotificationsContent();
        mainContent.appendChild(notificationsContent);
        return mainContent;
    }

    private async renderNotificationsContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const settingsNotificationsComponent = new SettingsNotifications({});
        return await settingsNotificationsComponent.render();
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
        
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        super.destroy();
        
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}