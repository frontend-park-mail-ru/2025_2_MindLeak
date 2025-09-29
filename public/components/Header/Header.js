let headerTemplate = null;

async function getHeaderTemplate() {
    if (headerTemplate) return headerTemplate;

    const inputRes = await fetch('/components/Input/Input.hbs');
    const inputSource = await inputRes.text();
    Handlebars.registerPartial('input', Handlebars.compile(inputSource));

    const buttonRes = await fetch('/components/FormButton/FormButton.hbs');
    const buttonSource = await buttonRes.text();
    Handlebars.registerPartial('button', Handlebars.compile(buttonSource));

    const res = await fetch('/components/Header/Header.hbs');
    const source = await res.text();
    headerTemplate = Handlebars.compile(source);
    return headerTemplate;
}

async function checkAuth() {
    try {
        const res = await fetch('http://62.109.19.84:8090/me', { 
            method: 'GET',
            credentials: 'include'
        });

        console.log('Auth response status:', res.status);

        if (res.ok) {
            const userData = await res.json();

            console.log('User data:', userData);

            return {
                isLoggedIn: true,
                user: {
                    name: userData.name,
                    avatar: userData.avatar || '/img/defaultAvatar.jpg'
                }
            };
        }
        return { isLoggedIn: false, user: null };
    } catch (error) {
        console.error('Auth check error:', error);
        return { isLoggedIn: false, user: null };
    }
}

export class Header {
    constructor({ LoginForm } = {}) {
        this.LoginForm = LoginForm;
    }

    async render() {
        const template = await getHeaderTemplate();
        const authData = await checkAuth(); 

        const html = template({
            isLoggedIn: authData.isLoggedIn,
            user: authData.user
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const header = div.firstElementChild;

        const userMenu = header.querySelector('[data-key="user-menu"]');
        if (userMenu) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Выпадающее меню пользователя');
            });
        }

        const createPostButton = header.querySelector('button[data-key="createPost"]');
        if (createPostButton && authData.isLoggedIn) { 
            createPostButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create post clicked');
            });
        }

        const logoLink = header.querySelector('.header__logo');
        if (logoLink && !authData.isLoggedIn) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Logo clicked - go to home');
            });
        }

        const loginButton = header.querySelector('button[data-key="login"]');
        if (loginButton && !authData.isLoggedIn) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Login button clicked');
                const loginForm = new this.LoginForm();
                const modal = await loginForm.render();
                document.body.appendChild(modal);
            });
        }

        const logoutButton = header.querySelector('button[data-key="logout"]');
        if (logoutButton && authData.isLoggedIn) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const res = await fetch('http://62.109.19.84:8090/logout', { 
                        method: 'POST',
                        credentials: 'include'
                    });
                    if (res.ok) {
                        window.location.reload(); 
                    } else {
                        console.error('Ошибка при выходе');
                    }
                } catch (err) {
                    console.error('Не удалось выйти:', err);
                }
            });
        }

        return header;
    }
}

export { checkAuth };