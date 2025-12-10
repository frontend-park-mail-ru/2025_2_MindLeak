import { BaseView } from './viewBase';
import { SettingsPrivacy } from '../components/SettingsPrivacy/SettingsPrivacy';
import { userListStore } from '../stores/storeUserList';

export class SettingsPrivacyView extends BaseView {
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
        
        const privacyContent = await this.renderPrivacyContent();
        mainContent.appendChild(privacyContent);
        return mainContent;
    }

    private async renderPrivacyContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const settingsPrivacyComponent = new SettingsPrivacy({});
        return await settingsPrivacyComponent.render();
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