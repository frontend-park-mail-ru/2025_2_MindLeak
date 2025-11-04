import { SettingsAccount } from '../components/SettingsAccount/SettingsAccount';
import { SidebarMenu } from '../components/SidebarMenu/SidebarMenu';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';
import { settingsAccountStore, SettingsAccountState } from '../stores/storeSettingsAccount';
import { editProfileStore } from '../stores/storeProfileEdit';
import { EditProfileView } from '../views/viewProfileEdit';
import { DeleteAccountModal } from '../components/DeleteAccount/DeleteAccount';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { router } from '../router/router';

export class SettingsAccountView {
    private container: HTMLElement;
    private boundStoreHandler: () => void;
    private boundEditStoreHandler: () => void;
    private sidebarMenu: SidebarMenu | null = null;
    private topBloggers: TopBloggers | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private editProfileView: EditProfileView | null = null;
    private deleteModal: DeleteAccountModal | null = null;
    private boundLoginStoreHandler: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundEditStoreHandler = this.handleEditStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
        settingsAccountStore.addListener(this.boundStoreHandler);
        editProfileStore.addListener(this.boundEditStoreHandler);
        loginStore.addListener(this.boundLoginStoreHandler);
        
        //загруж данные настроек учетной записи
        dispatcher.dispatch('SETTINGS_ACCOUNT_LOAD_REQUEST');
        
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

        // Центральная область с настройками учетной записи
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const accountContent = await this.renderAccountContent();
        mainContent.appendChild(accountContent);

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

        // Проверяем, нужно ли открыть форму редактирования
        this.checkEditForm();
    }

    private async renderAccountContent(): Promise<HTMLElement> {
        const currentState = settingsAccountStore.getState();
        console.log('Current account state:', currentState);
        
        const settingsAccountComponent = new SettingsAccount({
            userData: currentState.settings
        });
        const element = await settingsAccountComponent.render();
        this.attachEditButtonListener(element);
        this.attachDeleteButtonListener(element);
        return element;
    }

    private attachEditButtonListener(container: HTMLElement): void {
        container.addEventListener('editAccountRequest', () => {
            this.handleEditButtonClick();
        });
    }

    private attachDeleteButtonListener(container: HTMLElement): void {
        container.addEventListener('deleteAccountRequest', () => {
            this.openDeleteModal();
        });
    }

    private handleLoginStoreChange(): void {
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            loginStore.removeListener(this.boundLoginStoreHandler);
            router.navigate('/');
        }
    }

    private handleEditButtonClick(): void {
        const accountState = settingsAccountStore.getState();
        console.log('Edit button clicked, account state:', accountState);
        
        if (accountState.settings) {
            const initialData = {
                name: accountState.settings.name || '',
                phone: accountState.settings.phone || '',
                email: accountState.settings.email || '',
                country: accountState.settings.country || '',
                language: accountState.settings.language || 'Русский',
                sex: accountState.settings.sex || 'other',
                date_of_birth: accountState.settings.date_of_birth || '',
            };
            
            console.log('Dispatching EDIT_PROFILE_OPEN with data:', initialData);
            
            dispatcher.dispatch('EDIT_PROFILE_OPEN', { 
                initialData: initialData 
            });
        } else {
            console.error('No settings data available when opening edit form');
        }
    }

    private async openDeleteModal(): Promise<void> {
        if (this.deleteModal) return;

        this.deleteModal = new DeleteAccountModal();
        const modalElement = await this.deleteModal.render();
        
        //удаление
        modalElement.addEventListener('accountDeleteRequest', () => {
            this.handleAccountDelete();
        });

        this.pageWrapper?.appendChild(modalElement);
    }

    private handleAccountDelete(): void {
        dispatcher.dispatch('ACCOUNT_DELETE_REQUEST');
        this.closeDeleteModal();
    }

    private closeDeleteModal(): void {
        if (this.deleteModal) {
            this.deleteModal.destroy();
            this.deleteModal = null;
        }
    }

    private async checkEditForm(): Promise<void> {
        const editState = editProfileStore.getState();
        console.log('Checking edit form, editState:', editState);
        
        if (editState.isOpen && !this.editProfileView) {
            console.log('Creating EditProfileView with formData:', editState.formData);
            this.editProfileView = new EditProfileView();
            const modal = await this.editProfileView.render();
            this.pageWrapper?.appendChild(modal);
        }
    }

    private handleStoreChange(): void {
        const state = settingsAccountStore.getState();
        console.log('Settings account store changed:', state);
        
        if (state.error) {
            console.error('Settings account error:', state.error);
        }
        
        // перерисовываем компонент
        if (state.settings && !state.isLoading) {
            this.updateAccountContent();
        }
    }

    private handleEditStoreChange(): void {
        const editState = editProfileStore.getState();
        console.log('Edit profile store changed:', editState);
        
        if (editState.isOpen) {
            this.checkEditForm();
        } else if (this.editProfileView) {
            this.editProfileView.destroy();
            this.editProfileView = null;
        }
    }

    private async updateAccountContent(): Promise<void> {
        if (!this.pageWrapper) return;
        
        const mainContent = this.pageWrapper.querySelector('.main-content');
        if (mainContent) {

            const oldContent = mainContent.querySelector('.settings-account');
            if (oldContent) {
                oldContent.remove();
            }
            
            const newContent = await this.renderAccountContent();
            mainContent.appendChild(newContent);
        }
    }

    destroy(): void {
        settingsAccountStore.removeListener(this.boundStoreHandler);
        editProfileStore.removeListener(this.boundEditStoreHandler);
        if (this.editProfileView) {
            this.editProfileView.destroy();
        }
        if (this.deleteModal) {
            this.deleteModal.destroy();
        }
        this.headerInstance.destroy();
    }
}