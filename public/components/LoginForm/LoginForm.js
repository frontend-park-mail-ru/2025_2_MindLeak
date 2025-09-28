let loginTemplate = null; //кэширование 

async function getLoginTemplate() {
    if (loginTemplate) return loginTemplate; //если шаблон есть в кэше - возвращаем его

    // загружаем и регистрируем partials - вложенные шаблоны
    const inputRes = await fetch('/components/Input/Input.hbs'); //загрузка шаблона (возвращ promise)
    const inputSource = await inputRes.text(); //из-за hbs - текст
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/LoginForm/LoginForm.hbs');
    const source = await res.text();
    loginTemplate = Handlebars.compile(source);
    return loginTemplate;
}

function clearErrors(form) {
    form.querySelectorAll('.form__input').forEach(input => {
        input.classList.remove('error');
    });

    form.querySelectorAll('.field-error').forEach(el => el.remove());
    const globalError = form.querySelector('.global-error');
    if (globalError) globalError.remove();
}

function showFieldErrors(form, errors) {
    errors.forEach(({ field, message }) => {
        const input = form.querySelector(`input[name="${field}"]`);
        if (!input) return;

        // добав класс error к инпуту
        input.classList.add('error');

        const errorEl = document.createElement('div');// элемен для  ошибки
        errorEl.className = 'field-error';
        errorEl.textContent = message; 

        // встав исп .input-wrapper
        const wrapper = input.closest('.input-wrapper');
        if (wrapper) {
            wrapper.parentNode.insertBefore(errorEl, wrapper.nextSibling);
        } else {
             //todo
            input.parentNode.insertBefore(errorEl, input.nextSibling);
        }
        
    });
}

function showGlobalError(form, message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'global-error';
    errorEl.textContent = message;

    //todo - переписать
    form.appendChild(errorEl);
}

export class LoginForm {
    async render() {
        const template = await getLoginTemplate();
        
        const html = template();


        const div = document.createElement('div');
        div.innerHTML = html.trim(); //убрали пробелы

        // обработчик пароля
        const toggle = div.querySelector('.password-toggle');
        const passwordInput = div.querySelector('input[name="password"]');
        if (toggle && passwordInput) {
            toggle.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggle.textContent = '🙈'; //todo
                } else {
                passwordInput.type = 'password';
                toggle.textContent = '🙉'; //todo
                }
            });
        }

        // cохр ссылку на модальное окно
        const modal = div.firstElementChild;

        const form = div.querySelector('.login-form__body');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const email = formData.get('email')?.trim();
            const password = formData.get('password');

            console.log('Login attempt with:', { email, password });

            clearErrors(form);

            const errors = [];

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

                const res = await fetch('http://62.109.19.84:8090/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                console.log('Login response status:', res.status);
                console.log('Login response headers:', res.headers);

                // Проверяем content-type перед парсингом JSON
                const contentType = res.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    console.log('Non-JSON response:', text);
                    throw new Error('Server returned non-JSON response');
                }

                console.log('Login response data:', data);

                if (!res.ok) {
                    clearErrors(form);

                    if (data.errors && Array.isArray(data.errors)) {
                       
                        const fieldErrors = data.errors.map(error => ({
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

        const signUpLink = div.querySelector('.login-form__footer .link');
        if (signUpLink) {
            signUpLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                // удаляем modal (а не через div)
                if (modal.parentNode) {
                    modal.remove();
                }
                
                import('/components/SignUpForm/SignUpForm.js').then(({ SignUpForm }) => {
                    new SignUpForm().render().then(newModal => {
                        document.body.appendChild(newModal);
                    });
                });
        });
        }

        // обработчик закрытия по клику вне формы
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        return modal;
    }
}