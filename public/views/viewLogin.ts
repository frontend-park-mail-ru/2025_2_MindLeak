import { LoginForm } from '../components/LoginForm/LoginForm';
import { dispatcher } from '../dispatcher/dispatcher';
import { router } from '../router/router';
import { loginStore } from '../stores/storeLogin';
import { SignUpFormView } from './viewSignUp';

export class LoginFormView {
    private targetUrl: string | null;
    private loginForm: LoginForm;
    private formElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;

    constructor(targetUrl?: string) {
        this.loginForm = new LoginForm();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.targetUrl = targetUrl || null;
        this.init();
    }

    private init(): void {
        loginStore.addListener(this.boundStoreHandler);
    }

    async render(): Promise<HTMLElement> {
        this.formElement = await this.loginForm.render();
        this.setupEventHandlers();
        return this.formElement;
    }

    private setupEventHandlers(): void {
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.login-form__body') as HTMLFormElement;
        if (form) {
            const newForm = form.cloneNode(true) as HTMLFormElement;
            form.parentNode?.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', this.handleSubmit.bind(this));
            this.setupPasswordToggle(newForm);
        }

        const signUpLink = this.formElement.querySelector('.login-form__footer .link') as HTMLAnchorElement;
        if (signUpLink) {
            signUpLink.addEventListener('click', this.handleSignUpClick.bind(this));
        }
    }

    private setupPasswordToggle(form: HTMLFormElement): void {
        const toggle = form.querySelector('.password-toggle');
        const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
        
        if (toggle && passwordInput) {
            toggle.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggle.textContent = '🙈';
                } else {
                    passwordInput.type = 'password';
                    toggle.textContent = '🙉';
                }
            });
        }
    }

    private async handleSubmit(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        
        if (!this.formElement) return;

        const form = this.formElement.querySelector('.login-form__body') as HTMLFormElement;
        const formData = new FormData(form);
        const email = (formData.get('email') as string)?.trim();
        const password = formData.get('password') as string;

        this.clearErrors(form);

        // валидация
        const errors: Array<{ field: string; message: string }> = [];

        if (!email) {
            errors.push({ field: 'email', message: 'Email обязателен' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ field: 'email', message: 'Некорректный email' });
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

        if (errors.length > 0) {
            this.showFieldErrors(form, errors);
            return;
        }

        dispatcher.dispatch('LOGIN_REQUEST', { email, password });
    }

    private handleStoreChange(): void {
        const state = loginStore.getState();
        
        if (state.error && this.formElement) {
            const form = this.formElement.querySelector('.login-form__body') as HTMLFormElement;
            this.showFieldErrors(form, [
                { field: 'email', message: state.error }
            ]);
        }
        
        if (state.isLoggedIn && this.formElement) {
            // Закрываем модальное окно при успешном логине
            this.destroy();
            
            // Редирект на целевой URL или обновление страницы
            if (this.targetUrl && this.targetUrl !== '/') {
                router.navigate(this.targetUrl);
            } else {
                window.location.reload();
            }
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

            const wrapper = input.closest('.input-wrapper');
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

    private handleSignUpClick(e: Event): void {
        e.preventDefault();
        this.destroy();
        
        const signUpView = new SignUpFormView();
        signUpView.render().then(modal => {
            document.body.appendChild(modal);
        });
    }

    destroy(): void {
        loginStore.removeListener(this.boundStoreHandler);
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.remove();
        }
    }
}
