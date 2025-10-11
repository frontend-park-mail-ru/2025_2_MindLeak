/**
 * Кэшированный шаблон формы входа
 */
let loginTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для ошибок валидации
 */
interface ValidationError {
    field: string;
    message: string;
}

/**
 * Асинхронно загружает шаблон формы входа с зависимыми partials
 * @returns {Promise<Handlebars.TemplateDelegate>} - cкомпилированный Handlebars-шаблон
 */
async function getLoginTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (loginTemplate) return loginTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/LoginForm/LoginForm.hbs');
    const source = await res.text();
    loginTemplate = Handlebars.compile(source);
    return loginTemplate;
}

/**
 * Очищает все ошибки в форме: убирает классы ошибок и удаляет элементы с сообщениями
 * @param {HTMLFormElement} form - форма, из которой нужно удалить ошибки
 */
function clearErrors(form: HTMLFormElement): void {
    form.querySelectorAll('.form__input').forEach((input: Element) => {
        input.classList.remove('error');
    });

    form.querySelectorAll('.field-error').forEach((el: Element) => el.remove());
    const globalError = form.querySelector('.global-error');
    if (globalError) globalError.remove();
}

/**
 * Отображает ошибки валидации под соответствующими полями формы
 * @param {HTMLFormElement} form - целевая форма
 * @param {Array<ValidationError>} errors - массив ошибок с указанием поля и сообщения
 */
function showFieldErrors(form: HTMLFormElement, errors: ValidationError[]): void {
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

/**
 * Отображает глобальную ошибку внизу формы
 * @param {HTMLFormElement} form - целевая форма
 * @param {string} message - текст ошибки
 */
function showGlobalError(form: HTMLFormElement, message: string): void {
    const errorEl = document.createElement('div');
    errorEl.className = 'global-error';
    errorEl.textContent = message;

    form.appendChild(errorEl);
}

/**
 * Класс для рендеринга и управления формой входа
 */
export class LoginForm {
    async render(): Promise<HTMLElement> {
        const template = await getLoginTemplate();
        
        // ✅ Исправлено: передаем контекст в шаблон
        const html = template({});

        const div = document.createElement('div');
        div.innerHTML = html.trim();

        const toggle = div.querySelector('.password-toggle');
        const passwordInput = div.querySelector('input[name="password"]') as HTMLInputElement;
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

        const modal = div.firstElementChild as HTMLElement;
        if (!modal) {
            throw new Error('Modal element not found');
        }

        const form = div.querySelector('.login-form__body') as HTMLFormElement;
        if (!form) {
            throw new Error('Form element not found');
        }

        form.addEventListener('submit', async (e: SubmitEvent) => {
            e.preventDefault();

            const formData = new FormData(form);
            const email = (formData.get('email') as string)?.trim();
            const password = formData.get('password') as string;

            console.log('Login attempt with:', { email, password });

            clearErrors(form);

            const errors: ValidationError[] = [];

            if (!email) {
                errors.push({ field: 'email', message: 'Email обязателен' });
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push({ field: 'email', message: 'Некорректный email' });
            }

            if (!password) {
                errors.push({ field: 'password', message: 'Пароль обязателен' });
            } else if (password.length < 4 || /\s/.test(password)) {
                errors.push({ field: 'password', message: 'Пароль должен быть не короче 4 символов и без пробелов' });
            }

            showFieldErrors(form, errors);

            if (errors.length > 0) {
                return;
            }

            try {
                console.log('Sending login request to /api/login...');

                const res = await fetch('https://mindleak.ru/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                console.log('Login response status:', res.status);
                console.log('Login response headers:', res.headers);

                const contentType = res.headers.get('content-type');
                let data: any;

                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    console.log('Non-JSON response:', text);
                    throw new Error('Server returned non-JSON response');
                }

                console.log('Login response data:', data);

                if (res.status === 404 || res.status === 401) {
                    showFieldErrors(form, [
                        { field: 'email', message: 'Email или пароль указаны неверно' }
                    ]);
                    return;
                }
                
                if (!res.ok) {
                    clearErrors(form);

                    if (data.errors && Array.isArray(data.errors)) {
                        const fieldErrors = data.errors.map((error: any) => ({
                            field: error.field || 'email',
                            message: error.message || 'Ошибка авторизации'
                        }));
                        showFieldErrors(form, fieldErrors);
                    } else if (data.message) {
                        showGlobalError(form, data.message);
                    } else {
                        showGlobalError(form, 'Ошибка авторизации');
                    }

                    return;
                }

                if (res.status === 200) {
                    console.log('Login successful!');
                    if (modal.parentNode) modal.remove();
                    window.location.reload();
                }
            } catch (err) {
                console.error('Ошибка сети:', err);
                showGlobalError(form, 'Ошибка сети. Проверьте подключение.');
            }
        });

        const signUpLink = div.querySelector('.login-form__footer .link') as HTMLAnchorElement;
        if (signUpLink) {
            signUpLink.addEventListener('click', (e: Event) => {
                e.preventDefault();
                
                if (modal.parentNode) {
                    modal.remove();
                }
                
                // ✅ Импортируем .js файл
                // @ts-ignore
                import('/dist/components/SignUpForm/SignUpForm.js').then(({ SignUpForm }) => {
                    new SignUpForm().render().then((newModal: HTMLElement) => {
                        document.body.appendChild(newModal);
                    });
                });
            });
        }

        modal.addEventListener('click', (e: Event) => {
            if (e.target === modal) modal.remove();
        });

        return modal;
    }
}