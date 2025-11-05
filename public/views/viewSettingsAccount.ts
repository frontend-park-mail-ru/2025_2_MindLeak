import { SettingsAccount } from '../components/SettingsAccount/SettingsAccount';
import { SidebarMenu } from '../components/SidebarMenu/SidebarMenu';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { Header } from '../components/Header/Header';
import { settingsAccountStore, SettingsAccountState } from '../stores/storeSettingsAccount';
import { DeleteAccountModal } from '../components/DeleteAccount/DeleteAccount';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { router } from '../router/router';

export class SettingsAccountView {
    private container: HTMLElement;
    private boundStoreHandler: () => void;
    private sidebarMenu: SidebarMenu | null = null;
    private topBloggers: TopBloggers | null = null;
    private headerInstance: Header;
    private pageWrapper: HTMLElement | null = null;
    private deleteModal: DeleteAccountModal | null = null;
    private boundLoginStoreHandler: () => void;
    private boundFormSubmitHandler: (e: SubmitEvent) => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.headerInstance = new Header();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundFormSubmitHandler = this.handleFormSubmit.bind(this);
    }

    async render(): Promise<HTMLElement> {
        settingsAccountStore.addListener(this.boundStoreHandler);
        loginStore.addListener(this.boundLoginStoreHandler);
        
        // загружаем данные настроек учетной записи
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
    }

    private async renderAccountContent(): Promise<HTMLElement> {
        const currentState = settingsAccountStore.getState();
        
        const settingsAccountComponent = new SettingsAccount({
            userData: currentState.settings,
            isLoading: currentState.isUpdating,
            error: currentState.error
        });
        
        const element = await settingsAccountComponent.render();
        this.attachEventListeners(element);
        return element;
    }

    private attachEventListeners(container: HTMLElement): void {
        
        const form = container.querySelector('.settings-account__form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', this.boundFormSubmitHandler);
        }

        
        const deleteButton = container.querySelector('.settings-account__delete-button') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.openDeleteModal();
            });
        }

        
        const changeAvatarBtn = container.querySelector('#change-avatar-btn') as HTMLButtonElement;
        const deleteAvatarBtn = container.querySelector('#delete-avatar-btn') as HTMLButtonElement;
        const avatarUpload = container.querySelector('#avatar-upload') as HTMLInputElement;

        if (changeAvatarBtn && avatarUpload) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarUpload.click();
            });
        }

        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this.handleAvatarUpload(e);
            });
        }

        if (deleteAvatarBtn) {
            deleteAvatarBtn.addEventListener('click', () => {
                this.handleAvatarDelete();
            });
        }

        const changeCoverBtn = container.querySelector('#change-cover-btn') as HTMLButtonElement;
        const deleteCoverBtn = container.querySelector('#delete-cover-btn') as HTMLButtonElement;
        const coverUpload = container.querySelector('#cover-upload') as HTMLInputElement;

        if (changeCoverBtn && coverUpload) {
            changeCoverBtn.addEventListener('click', () => {
                coverUpload.click();
            });
        }

        if (coverUpload) {
            coverUpload.addEventListener('change', (e) => {
                this.handleCoverUpload(e);
            });
        }

        if (deleteCoverBtn) {
            deleteCoverBtn.addEventListener('click', () => {
                this.handleCoverDelete();
            });
        }
    }

    private async handleAvatarUpload(e: Event): Promise<void> {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        
        // Проверка формата
        if (!file.type.startsWith('image/jpeg')) {
            alert('Пожалуйста, выберите файл в формате JPEG (JPG)');
            return;
        }

        // Проверка размера (например, максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Размер файла не должен превышать 5MB');
            return;
        }

        dispatcher.dispatch('AVATAR_UPLOAD_REQUEST', { file });

        input.value = '';
    }

    private handleAvatarDelete(): void {
        dispatcher.dispatch('AVATAR_DELETE_REQUEST');
    }

    private async handleCoverUpload(e: Event): Promise<void> {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        
        if (!file.type.startsWith('image/jpeg')) {
            alert('Пожалуйста, выберите файл в формате JPEG (JPG)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Размер файла не должен превышать 10MB');
            return;
        }

        dispatcher.dispatch('COVER_UPLOAD_REQUEST', { file });

        input.value = '';
    }

    private handleCoverDelete(): void {
        dispatcher.dispatch('COVER_DELETE_REQUEST');
    }

    private async handleFormSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        
        if (!this.pageWrapper) return;

        const form = this.pageWrapper.querySelector('.settings-account__form') as HTMLFormElement;
        if (!form) return;

        const formData = new FormData(form);
        const currentState = settingsAccountStore.getState();

        const updatedData: any = {};

        const name = (formData.get('name') as string)?.trim();
        if (name) updatedData.name = name;

        const password = (formData.get('password') as string)?.trim();
        if (password) {
            updatedData.password = password;
        }

        const phone = (formData.get('phone') as string)?.trim();
        const country = (formData.get('country') as string)?.trim();
        const language = formData.get('language') as string;
        const sex = formData.get('sex') as string;
        const date_of_birth = formData.get('date_of_birth') as string;

        if (phone !== undefined) updatedData.phone = phone || '';
        if (country !== undefined) updatedData.country = country || '';
        if (language !== undefined) updatedData.language = language;
        if (sex !== undefined) updatedData.sex = sex;
        if (date_of_birth !== undefined) updatedData.date_of_birth = date_of_birth || '';

        console.log('Updating profile with:', updatedData);

        const errors = this.validateForm(updatedData);
        if (errors.length > 0) {
            this.showFieldErrors(form, errors);
            return;
        }

        dispatcher.dispatch('SETTINGS_ACCOUNT_UPDATE_REQUEST', { 
            settings: updatedData,
            currentSettings: currentState.settings
        });
    }

    private validateForm(data: any): Array<{ field: string; message: string }> {
        const errors: Array<{ field: string; message: string }> = [];

        if (!data.name || data.name.trim().length < 4) {
            errors.push({ field: 'name', message: 'Имя должно быть не менее 4 символов' });
        }

        if (data.password && data.password.length < 4) {
            errors.push({ field: 'password', message: 'Пароль должен быть не менее 4 символов' });
        }

        if (data.phone && !/^\+?[\d\s\-()]+$/.test(data.phone)) {
            errors.push({ field: 'phone', message: 'Некорректный формат телефона' });
        }

        if (data.date_of_birth) {
            const birthDate = new Date(data.date_of_birth);
            const today = new Date();
            if (birthDate > today) {
                errors.push({ field: 'date_of_birth', message: 'Дата рождения не может быть в будущем' });
            }
        }

        return errors;
    }

    private showFieldErrors(form: HTMLFormElement, errors: Array<{ field: string; message: string }>): void {
        this.clearErrors(form);
        
        errors.forEach(({ field, message }) => {
            const input = form.querySelector(`[name="${field}"]`) as HTMLInputElement;
            if (!input) return;

            input.classList.add('error');

            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;

            const wrapper = input.closest('.settings-account__field');
            if (wrapper) {
                wrapper.appendChild(errorEl);
            }
        });
    }

    private clearErrors(form: HTMLFormElement): void {
        form.querySelectorAll('.form__input').forEach((input: Element) => {
            input.classList.remove('error');
        });
        form.querySelectorAll('.field-error, .global-error').forEach((el: Element) => el.remove());
    }

    private handleLoginStoreChange(): void {
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            loginStore.removeListener(this.boundLoginStoreHandler);
            router.navigate('/');
        }
    }

    private async openDeleteModal(): Promise<void> {
        if (this.deleteModal) return;

        this.deleteModal = new DeleteAccountModal();
        const modalElement = await this.deleteModal.render();
        
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

    private handleStoreChange(): void {
        const state = settingsAccountStore.getState();
        
        if (state.error) {
            console.error('Settings account error:', state.error);
        }
        
        this.updateAccountContent();
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
        loginStore.removeListener(this.boundLoginStoreHandler);
        
        if (this.pageWrapper) {
            const form = this.pageWrapper.querySelector('.settings-account__form') as HTMLFormElement;
            if (form) {
                form.removeEventListener('submit', this.boundFormSubmitHandler);
            }
        }
        
        if (this.deleteModal) {
            this.deleteModal.destroy();
        }
        this.headerInstance.destroy();
    }
}