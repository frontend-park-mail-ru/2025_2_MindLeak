import { SignUpForm } from '../components/SignUpForm/SignUpForm';
import { dispatcher } from '../dispatcher/dispatcher';
import { signUpStore } from '../stores/storeSignUp';
import { LoginFormView } from './viewLogin';

export class SignUpFormView {
    private signUpForm: SignUpForm;
    private formElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;

    constructor() {
        this.signUpForm = new SignUpForm();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.init();
    }

    private init(): void {
        signUpStore.addListener(this.boundStoreHandler);
    }

    async render(): Promise<HTMLElement> {
        this.formElement = await this.signUpForm.render();
        this.setupEventHandlers();
        return this.formElement;
    }

    private setupEventHandlers(): void {
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.registration-form__body') as HTMLFormElement;
        if (form) {
            const newForm = form.cloneNode(true) as HTMLFormElement;
            form.parentNode?.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', this.handleSubmit.bind(this));
            this.setupPasswordToggles(newForm);
        }

        const loginLink = this.formElement.querySelector('.registration-form__footer .link') as HTMLAnchorElement;
        if (loginLink) {
            loginLink.addEventListener('click', this.handleLoginClick.bind(this));
        }
    }

    private setupPasswordToggles(form: HTMLFormElement): void {
        const toggles = form.querySelectorAll('.form__password-toggle');
        const passwordInputs = form.querySelectorAll('input[type="password"]') as NodeListOf<HTMLInputElement>;

        toggles.forEach((toggle: Element, index: number) => {
            toggle.addEventListener('click', () => {
                const input = passwordInputs[index];
                if (input.type === 'password') {
                    input.type = 'text';
                    toggle.textContent = '🙈';
                } else {
                    input.type = 'password';
                    toggle.textContent = '🙉';
                }
            });
        });
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.registration-form__body') as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get('username') as string;
        const email = (formData.get('email') as string)?.trim();
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        this.clearErrors(form);

        const errors: Array<{ field: string; message: string }> = [];

        if (!name) {
            errors.push({ field: 'username', message: 'Название аккаунта обязательно' });
        } else if (name.length < 4) {
            errors.push({ field: 'username', message: 'Название аккаунта должно быть не короче 4 символов' });
        } else if (name.length > 32) {
            errors.push({ field: 'username', message: 'Название аккаунта должно быть короче 33 символов' });
        }

        if (!email) {
            errors.push({ field: 'email', message: 'Email обязателен' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ field: 'email', message: 'Некорректный email' });
        }else if (email.length > 320) {
            errors.push({ field: 'email', message: 'email должен быть короче 320 символов' });
        }

        if (!password) {
            errors.push({ field: 'password', message: 'Пароль обязателен' });
        } else if (/\s/.test(password)) {
            errors.push({ field: 'password', message: 'Пароль должен быть без пробелов' });
        } else if (password.length < 4) {
            errors.push({ field: 'password', message: 'Пароль должен быть не короче 4 символов и без пробелов' });
        } else if (password.length > 64) {
            errors.push({ field: 'password', message: 'Пароль должен быть короче 65 символов и без пробелов' });
        }

        if (!confirmPassword) {
            errors.push({ field: 'confirmPassword', message: 'Подтверждение пароля обязательно' });
        } else if (password !== confirmPassword) {
            errors.push({ field: 'confirmPassword', message: 'Пароли не совпадают' });
        }

        if (errors.length > 0) {
            this.showFieldErrors(form, errors);
            return;
        }

        dispatcher.dispatch('SIGNUP_REQUEST', { name, email, password });
    }

    private handleStoreChange(): void {
        const state = signUpStore.getState();
        
        if (state.error && this.formElement) {
            const form = this.formElement.querySelector('.registration-form__body') as HTMLFormElement;
            this.showFieldErrors(form, [
                { field: 'email', message: state.error }
            ]);
        }
        
        if (state.fieldErrors && this.formElement) {
            const form = this.formElement.querySelector('.registration-form__body') as HTMLFormElement;
            this.showFieldErrors(form, state.fieldErrors);
        }
        
        if (state.isSuccess && this.formElement) {
            this.destroy();
            window.location.reload();
        }
    }

    private showFieldErrors(form: HTMLFormElement, errors: Array<{ field: string; message: string }>): void {
        errors.forEach(({ field, message }) => {
            const input = form.querySelector(`input[name="${field}"]`) as HTMLInputElement;
            if (!input) return;

            input.classList.add('error');

            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;

            const wrapper = input.closest('.form__input-wrapper');
            if (wrapper) {
                wrapper.parentNode!.insertBefore(errorEl, wrapper.nextSibling);
            } else {
                input.parentNode!.insertBefore(errorEl, input.nextSibling);
            }
        });
    }

    private showGlobalError(form: HTMLFormElement, message: string): void {
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

    private handleLoginClick(e: Event): void {
        e.preventDefault();
        this.destroy();
        
        const loginView = new LoginFormView();
        loginView.render().then(modal => {
            document.body.appendChild(modal);
        });
    }

    destroy(): void {
        signUpStore.removeListener(this.boundStoreHandler);
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.remove();
        }
    }
}
