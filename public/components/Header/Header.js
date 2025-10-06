import { PopUpMenu } from '/components/PopUpMenu/PopUpMenu.js';

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
        const res = await fetch('https://mindleak.ru/api/me', {
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
                    avatar: userData.avatar || '/img/defaultAvatar.jpg',
                    subtitle: userData.subtitle || 'Блог'
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
        if (userMenu && authData.isLoggedIn) {
            userMenu.addEventListener('click', async (e) => {
                e.stopPropagation();

                const existingMenu = document.querySelector('.popUp-menu');
                if (existingMenu) {
                    existingMenu.remove();
                    return; 
                }

                const popUpMenu = new PopUpMenu({
                    user: authData.user,
                    subtitle: authData.subtitle,
                    menuItems: [
                        { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
                        { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
                        { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
                        { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
                        { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
                    ]
                });

                const menuEl = await popUpMenu.render();

                const rect = userMenu.getBoundingClientRect();
                menuEl.style.position = 'absolute';
                menuEl.style.top = `${rect.bottom + 10}px`;
                menuEl.style.right = `${window.innerWidth - rect.right}px`;
                menuEl.style.zIndex = '1000';

                document.body.appendChild(menuEl);

                const closeMenu = (event) => {
                    if (!menuEl.contains(event.target) && event.target !== userMenu) {
                        menuEl.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };

                document.addEventListener('click', closeMenu);
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

        return header;
    }
}

export { checkAuth };