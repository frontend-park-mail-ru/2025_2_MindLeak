let signUpTemplate = null;

async function getSignUpTemplate() {
    if (signUpTemplate) return signUpTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/SignUpForm/SignUpForm.hbs');
    const source = await res.text();
    signUpTemplate = Handlebars.compile(source);
    return signUpTemplate;
}

function clearErrors(form) {
  form.querySelectorAll('.form__input').forEach(input => {
    input.classList.remove('error');
  });
  form.querySelectorAll('.field-error, .global-error').forEach(el => el.remove());
}

function showFieldErrors(form, errors) {
  errors.forEach(({ field, message }) => {
    const input = form.querySelector(`input[name="${field}"]`);
    if (!input) return;

    input.classList.add('error');

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.textContent = message;

    const wrapper = input.closest('.input-wrapper');
    if (wrapper) {
      wrapper.parentNode.insertBefore(errorEl, wrapper.nextSibling);
    } else {
      input.parentNode.insertBefore(errorEl, input.nextSibling);
    }
  });
}

function showGlobalError(form, message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'global-error';
    errorEl.textContent = message;

    form.appendChild(errorEl);
}

export class SignUpForm {
    async render() {
        const template = await getSignUpTemplate();

        const html = template();

        const div = document.createElement('div');
        div.innerHTML = html.trim();

        const toggles = div.querySelectorAll('.password-toggle');
        const passwordInputs = div.querySelectorAll('input[type="password"]');

        toggles.forEach((toggle, index) => {
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

        const modal = div.firstElementChild;

        const form = div.querySelector('.registration-form__body');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const name = formData.get('username');
            const email = formData.get('email')?.trim();
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');

            clearErrors(form);

            const errors = [];

            if (!name) {
                errors.push({ field: 'username', message: 'Название аккаунта обязательно' });
            } else if (name.length < 4 || /\s/.test(name)) {
                errors.push({ field: 'username', message: 'Название аккаунта должно быть не короче 4 символов и без пробелов' });
            }

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

            if (!confirmPassword) {
                errors.push({ field: 'confirmPassword', message: 'Подтверждение пароля обязательно' });
            } else if (password !== confirmPassword) {
                errors.push({ field: 'confirmPassword', message: 'Пароли не совпадают' });
            }

            showFieldErrors(form, errors);
            if (errors.length > 0) return;

            try {
                    const res = await fetch('http://62.109.19.84:8090/registration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();
                if (res.status === 409) {
                    showFieldErrors(form, [
                        { field: 'email', message: 'Пользователь с таким email уже зарегистрирован' }
                    ]);
                    return;
                }
                if (!res.ok) {
                    clearErrors(form);

                    if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
                        showFieldErrors(form, data.fieldErrors);
                    }

                    if (data.globalError) {
                        showGlobalError(form, data.globalError);
                    }

                    if (data.error && !data.globalError && !data.fieldErrors) {
                        showGlobalError(form, data.error);
                    }

                    return;
                }

                if (modal.parentNode) modal.remove();
                import('/components/LoginForm/LoginForm.js').then(({ LoginForm }) => {
                    new LoginForm().render().then(loginModal => {
                        document.body.appendChild(loginModal);
                    });
                });
            } catch (err) {
                console.error('Ошибка сети:', err);
                showGlobalError(form, 'Ошибка сети. Проверьте подключение.');
            }
        });

        const loginLink = div.querySelector('.registration-form__footer .link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (modal.parentNode) {
                    modal.remove();
                }
                import('/components/LoginForm/LoginForm.js').then(({ LoginForm }) => {
                    new LoginForm().render().then(newModal => {
                        document.body.appendChild(newModal);
                    });
                });
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }
}