import { ProfileEdit } from '../components/ProfileEdit/ProfileEdit';
import { editProfileStore, EditProfileState } from '../stores/storeProfileEdit';
import { settingsAccountStore } from '../stores/storeSettingsAccount';
import { dispatcher } from '../dispatcher/dispatcher';

export class EditProfileView {
    private formElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private boundAccountStoreHandler: () => void;

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundAccountStoreHandler = this.handleAccountStoreChange.bind(this);
        this.init();
    }

    private init(): void {
        editProfileStore.addListener(this.boundStoreHandler);
        settingsAccountStore.addListener(this.boundAccountStoreHandler);
    }

    async render(): Promise<HTMLElement> {
        const state = editProfileStore.getState();
        console.log('Rendering edit profile with data:', state.formData);
        
        const profileEditComponent = new ProfileEdit({
            settings: state.formData,
            isLoading: state.isLoading,
            error: state.error
        });
        
        this.formElement = await profileEditComponent.render();
        this.setupEventHandlers();
        
        return this.formElement;
    }

    private setupEventHandlers(): void {
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.edit-profile-form') as HTMLFormElement;
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        const cancelButton = this.formElement.querySelector('button[type="button"]') as HTMLButtonElement;
        if (cancelButton) {
            cancelButton.addEventListener('click', this.handleCancel.bind(this));
        }

        this.formElement.addEventListener('click', (e) => {
            if (e.target === this.formElement) {
                this.handleCancel();
            }
        });
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.edit-profile-form') as HTMLFormElement;
        const formData = new FormData(form);

        //  email из store (нет возможности менять сказал БЭК)
        const currentState = editProfileStore.getState();
        const currentEmail = currentState.formData.email;

        // Собираем данные формы
        const updatedData: any = {};

        // Обязат поля
        const name = (formData.get('name') as string)?.trim();
        
        if (name) updatedData.name = name;

        // Email - всегда берем из текущих данных store
        if (currentEmail) {
            updatedData.email = currentEmail;
        }

        // Пароль - отправляем только если указан
        const password = (formData.get('password') as string)?.trim();
        if (password) {
            updatedData.password = password;
        }

        // Необязательные поля
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

        // Валидация
        const errors = this.validateForm(updatedData);
        if (errors.length > 0) {
            this.showFieldErrors(form, errors);
            return;
        }

        // Отправляем запрос на обновление
        dispatcher.dispatch('EDIT_PROFILE_UPDATE_REQUEST', { settings: updatedData });
    }


    //todo ВАЛИДАЦИЯ КАК ЛОГИН И ПАРОЛЬ
    private validateForm(data: any): Array<{ field: string; message: string }> {
        const errors: Array<{ field: string; message: string }> = [];

        // Обязательные поля
        if (!data.name || data.name.trim().length === 0) {
            errors.push({ field: 'name', message: 'Имя обязательно' });
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

    private handleCancel(): void {
        dispatcher.dispatch('EDIT_PROFILE_CLOSE');
    }

    private handleStoreChange(): void {
        const state = editProfileStore.getState();
        
        if (!state.isOpen && this.formElement && this.formElement.parentNode) {
            // Закр модал окно
            this.formElement.remove();
        }
        
        if (state.error && this.formElement) {
            const form = this.formElement.querySelector('.edit-profile-form') as HTMLFormElement;
            this.showGlobalError(form, state.error);
        }
    }

    private handleAccountStoreChange(): void {

        const accountState = settingsAccountStore.getState();
        const editState = editProfileStore.getState();
        
        if (editState.isOpen && accountState.settings && !accountState.isUpdating) {
            dispatcher.dispatch('EDIT_PROFILE_CLOSE');
        }
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

            const wrapper = input.closest('.form-group');
            if (wrapper) {
                wrapper.appendChild(errorEl);
            }
        });
    }

    private showGlobalError(form: HTMLFormElement, message: string): void {
        this.clearErrors(form);
        
        const errorEl = document.createElement('div');
        errorEl.className = 'global-error';
        errorEl.textContent = message;
        form.appendChild(errorEl);
    }

    private clearErrors(form: HTMLFormElement): void {
        form.querySelectorAll('.form__input').forEach((input: Element) => {
            input.classList.remove('error');
        });
        form.querySelectorAll('.field-error, .global-error').forEach((el: Element) => el.remove());
    }

    destroy(): void {
        editProfileStore.removeListener(this.boundStoreHandler);
        settingsAccountStore.removeListener(this.boundAccountStoreHandler);
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.remove();
        }
    }
}