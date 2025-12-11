import { BaseView } from './viewBase';
import { SettingsAccount } from '../components/SettingsAccount/SettingsAccount';
import { settingsAccountStore, SettingsAccountState } from '../stores/storeSettingsAccount';
import { DeleteModalFactory } from '../components/DeleteModal/DeleteModalFactory';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList'; // todo изучить механику
import { router } from '../router/router';
import { dispatcher } from '../dispatcher/dispatcher';

export class SettingsAccountView extends BaseView {
    private container: HTMLElement;
    private boundSettingsStoreHandler: () => void;
    private boundLoginStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;
    private boundFormSubmitHandler: (e: SubmitEvent) => void;
    private deleteModal: any = null;
    private deleteAvatarModal: any = null;
    private deleteCoverModal: any = null;

    constructor(container: HTMLElement) {
        super();
        this.container = container;
        this.boundSettingsStoreHandler = this.handleSettingsStoreChange.bind(this);
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
        this.boundFormSubmitHandler = this.handleFormSubmit.bind(this);
    }

    protected determineCurrentCategory(): void {
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        this.determineCurrentCategory();

        // Подписываемся на stores
        settingsAccountStore.addListener(this.boundSettingsStoreHandler);
        loginStore.addListener(this.boundLoginStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // Рендерим базовую структуру
        await this.renderPageLayout();
        
        // Загружаем данные аккаунта
        dispatcher.dispatch('SETTINGS_ACCOUNT_LOAD_REQUEST');
        
        // Добавляем контент в container
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const accountContent = await this.renderAccountContent();
        mainContent.appendChild(accountContent);
        return mainContent;
    }

    private async renderAccountContent(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        const currentState = settingsAccountStore.getState();
        
        const settingsAccountComponent = new SettingsAccount({
            userData: currentState.settings,
            isLoading: currentState.isUpdating,
            error: currentState.error,
            isUploadingAvatar: currentState.isUploadingAvatar,
            isUploadingCover: currentState.isUploadingCover
        });
        
        const element = await settingsAccountComponent.render();
        this.attachEventListeners(element);
        return element;
    }

    private attachEventListeners(container: HTMLElement): void {
        if (this.isDestroyed) return;

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

    private closeDeleteAvatarModal(): void {
        if (this.deleteAvatarModal) {
            this.deleteAvatarModal.destroy();
            this.deleteAvatarModal = null;
        }
    }

    private closeDeleteCoverModal(): void {
        if (this.deleteCoverModal) {
            this.deleteCoverModal.destroy();
            this.deleteCoverModal = null;
        }
    }

    private async handleAvatarUpload(e: Event): Promise<void> {
        if (this.isDestroyed) return;
        
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        
        this.clearAvatarError();

        if (!file.type.startsWith('image/jpeg')) {
            this.showAvatarError('Пожалуйста, выберите файл в формате JPEG (JPG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showAvatarError('Размер файла не должен превышать 5MB');
            return;
        }

        dispatcher.dispatch('AVATAR_UPLOAD_REQUEST', { file });
        input.value = '';
    }

    private async handleAvatarDelete(): Promise<void> {
        if (this.isDestroyed) return;
        
        this.clearAvatarError();
        await this.openDeleteAvatarModal();
    }

    private async openDeleteAvatarModal(): Promise<void> {
        if (this.isDestroyed) return;
        
        this.deleteAvatarModal = DeleteModalFactory.createAvatarDeleteModal();
        const modalElement = await this.deleteAvatarModal.render();
        this.rootElement?.appendChild(modalElement);

        const confirmed = await this.deleteAvatarModal.waitForResult();
        if (confirmed) {
            dispatcher.dispatch('AVATAR_DELETE_REQUEST');
        }
        this.closeDeleteAvatarModal();
    }

    private async handleCoverUpload(e: Event): Promise<void> {
        if (this.isDestroyed) return;
        
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        
        this.clearCoverError();

        if (!file.type.startsWith('image/jpeg')) {
            this.showCoverError('Пожалуйста, выберите файл в формате JPEG (JPG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showCoverError('Размер файла не должен превышать 5MB');
            return;
        }

        dispatcher.dispatch('COVER_UPLOAD_REQUEST', { file });
        input.value = '';
    }

    private async handleCoverDelete(): Promise<void> {
        if (this.isDestroyed) return;
        
        this.clearCoverError();
        await this.openDeleteCoverModal();
    }

    private async openDeleteCoverModal(): Promise<void> {
        if (this.isDestroyed) return;
        
        this.deleteCoverModal = DeleteModalFactory.createCoverDeleteModal();
        const modalElement = await this.deleteCoverModal.render();
        this.rootElement?.appendChild(modalElement);

        const confirmed = await this.deleteCoverModal.waitForResult();
        if (confirmed) {
            dispatcher.dispatch('COVER_DELETE_REQUEST');
        }
        this.closeDeleteCoverModal();
    }

    private showAvatarError(message: string): void {
        if (this.isDestroyed) return;
        
        this.clearAvatarError();
        
        const avatarField = this.rootElement?.querySelector('.settings-account__field:nth-child(1)');
        if (avatarField) {
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;
            avatarField.appendChild(errorEl);
        }
    }

    private showCoverError(message: string): void {
        if (this.isDestroyed) return;
        
        this.clearCoverError();
        
        const coverField = this.rootElement?.querySelector('.settings-account__field:nth-child(2)');
        if (coverField) {
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;
            coverField.appendChild(errorEl);
        }
    }

    private clearAvatarError(): void {
        const avatarField = this.rootElement?.querySelector('.settings-account__field:nth-child(1)');
        if (avatarField) {
            const existingError = avatarField.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
        }
    }

    private clearCoverError(): void {
        const coverField = this.rootElement?.querySelector('.settings-account__field:nth-child(2)');
        if (coverField) {
            const existingError = coverField.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
        }
    }

    private async handleFormSubmit(e: SubmitEvent): Promise<void> {
        if (this.isDestroyed) return;
        
        e.preventDefault();
        
        if (!this.rootElement) return;

        const form = this.rootElement.querySelector('.settings-account__form') as HTMLFormElement;
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
        if (this.isDestroyed) return;
        
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            loginStore.removeListener(this.boundLoginStoreHandler);
            router.navigate('/');
        }
    }

    //обработчик изменений userListStore
    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        // Используем метод из BaseView
        this.updateUserListContent();
    }

    private async openDeleteModal(): Promise<void> {
        if (this.isDestroyed) return;
        
        this.deleteModal = DeleteModalFactory.createAccountDeleteModal();
        const modalElement = await this.deleteModal.render();
        
        this.rootElement?.appendChild(modalElement);

        const confirmed = await this.deleteModal.waitForResult();
        
        if (confirmed) {
            this.handleAccountDelete();
        }
    }

    private handleAccountDelete(): void {
        if (this.isDestroyed) return;
        
        dispatcher.dispatch('ACCOUNT_DELETE_REQUEST');
        this.closeDeleteModal();
    }

    private closeDeleteModal(): void {
        if (this.deleteModal) {
            this.deleteModal.destroy();
            this.deleteModal = null;
        }
    }

    private handleSettingsStoreChange(): void {
        if (this.isDestroyed) return;
        
        const state = settingsAccountStore.getState();
        
        // Если аватар или обложка обновились, обновляем профиль тоже
        if (state.settings) {
            const authState = loginStore.getState();
            if (authState.user) {
                // Обновляем loginStore
                dispatcher.dispatch('USER_UPDATE_PROFILE', {
                    user: {
                        ...authState.user,
                        name: state.settings.name,
                        avatar: state.settings.avatar_url,
                        email: state.settings.email
                    }
                });
                
                // Обновляем profileStore
                dispatcher.dispatch('PROFILE_UPDATE_AVATAR', {
                    avatar_url: state.settings.avatar_url
                });
                
                // Принудительно перезагружаем профиль если это профиль текущего пользователя
                const currentPath = window.location.pathname;
                if (currentPath === '/profile' || currentPath.includes('/profile?id=')) {
                    dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                        userId: authState.user.id 
                    });
                }
            }
        }
        
        this.updateAccountContent();
    }

    private async updateAccountContent(): Promise<void> {
        if (this.isDestroyed || !this.mainContent) return;
        
        const oldContent = this.mainContent.querySelector('.settings-account');
        if (oldContent) {
            const form = oldContent.querySelector('.settings-account__form') as HTMLFormElement;
            if (form) {
                form.removeEventListener('submit', this.boundFormSubmitHandler);
            }
            oldContent.remove();
        }
        
        const newContent = await this.renderAccountContent();
        this.mainContent.appendChild(newContent);
    }

    destroy(): void {
        this.isDestroyed = true;
        
        settingsAccountStore.removeListener(this.boundSettingsStoreHandler);
        loginStore.removeListener(this.boundLoginStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        if (this.rootElement) {
            const form = this.rootElement.querySelector('.settings-account__form') as HTMLFormElement;
            if (form) {
                form.removeEventListener('submit', this.boundFormSubmitHandler);
            }
        }
        
        if (this.deleteModal) {
            this.deleteModal.destroy();
        }
        if (this.deleteAvatarModal) {
            this.deleteAvatarModal.destroy();
        }
        if (this.deleteCoverModal) {
            this.deleteCoverModal.destroy();
        }
        
        super.destroy();
        
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}