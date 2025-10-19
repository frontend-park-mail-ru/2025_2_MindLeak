import { PopUpMenu } from '../PopUpMenu/PopUpMenu.js';

let headerTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для пользователя
 */
interface User {
    name: string;
    avatar: string;
    subtitle?: string;
}

/**
 * Интерфейс для данных аутентификации
 */
interface AuthData {
    isLoggedIn: boolean;
    user: User | null;
}

/**
 * Интерфейс для свойств Header
 */
interface HeaderProps {
    LoginForm?: any; // Замените на конкретный тип формы логина, если есть
}

/**
 * Асинхронно загружает шаблон header с зависимыми partials
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон header
 */
async function getHeaderTemplate(): Promise<Handlebars.TemplateDelegate> {
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

/**
 * Проверяет статус аутентификации пользователя
 * @returns {Promise<AuthData>} - данные аутентификации
 */
async function checkAuth(): Promise<AuthData> {
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

/**
 * Показывает форму авторизации
 * @param {any} LoginForm - класс формы логина
 */
async function showLoginForm(LoginForm: any): Promise<void> {
    console.log('Showing login form');
    const loginForm = new LoginForm();
    const modal = await loginForm.render();
    document.body.appendChild(modal);
}

/**
 * Класс для рендеринга header
 */
export class Header {
    private LoginForm?: any;

    constructor({ LoginForm }: HeaderProps = {}) {
        this.LoginForm = LoginForm;
    }

    /**
     * Рендерит header
     * @returns {Promise<HTMLElement>} - DOM-элемент header
     */
    async render(): Promise<HTMLElement> {
        const template = await getHeaderTemplate();
        const authData = await checkAuth(); 

        const html = template({
            isLoggedIn: authData.isLoggedIn,
            user: authData.user
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const header = div.firstElementChild as HTMLElement;
        
        if (!header) {
            throw new Error('Header element not found');
        }

        const userMenu = header.querySelector('[data-key="user-menu"]') as HTMLElement;
        if (userMenu && authData.isLoggedIn && authData.user) {
            userMenu.addEventListener('click', async (e: Event) => {
                e.stopPropagation();

                const existingMenu = document.querySelector('.popUp-menu');
                if (existingMenu) {
                    existingMenu.remove();
                    return; 
                }

                const popUpMenu = new PopUpMenu({
                    user: authData.user!,
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

                const closeMenu = (event: Event) => {
                    const target = event.target as Node;
                    if (!menuEl.contains(target) && target !== userMenu) {
                        menuEl.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };

                document.addEventListener('click', closeMenu);
            });
        }

        const createPostButton = header.querySelector('button[data-key="createPost"]') as HTMLButtonElement;
        if (createPostButton) {
            if (authData.isLoggedIn) { 
                createPostButton.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    console.log('Create post clicked - user is logged in');
                });
            } else {
                createPostButton.addEventListener('click', async (e: Event) => {
                    e.preventDefault();
                    console.log('Create post clicked - showing login form');
                    if (this.LoginForm) {
                        await showLoginForm(this.LoginForm);
                    }
                });
            }
        }

        const logoLink = header.querySelector('.header__logo') as HTMLAnchorElement;
        if (logoLink && !authData.isLoggedIn) {
            logoLink.addEventListener('click', (e: Event) => {
                e.preventDefault();
                console.log('Logo clicked - go to home');
            });
        }

        const loginButton = header.querySelector('button[data-key="login"]') as HTMLButtonElement;
        if (loginButton && !authData.isLoggedIn) {
            loginButton.addEventListener('click', async (e: Event) => {
                e.preventDefault();
                console.log('Login button clicked');
                if (this.LoginForm) {
                    await showLoginForm(this.LoginForm);
                }
            });
        }

        return header;
    }
}

export { checkAuth, showLoginForm };
export type { User, AuthData, HeaderProps };