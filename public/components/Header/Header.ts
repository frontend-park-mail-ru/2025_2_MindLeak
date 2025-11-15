import { PopUpMenu } from '../PopUpMenu/PopUpMenu';
import { loginStore } from '../../stores/storeLogin';
import { dispatcher } from '../../dispatcher/dispatcher';
import { LoginFormView } from '../../views/viewLogin';
import { router } from '../../router/router';
import { CreatePostFormView } from '../../views/viewCreatePostForm';

let headerTemplate: Handlebars.TemplateDelegate | null = null;
let isTemplateLoading: boolean = false;
let templateLoadPromise: Promise<Handlebars.TemplateDelegate> | null = null;

interface User {
    name: string;
    avatar: string;
    subtitle?: string;
}

async function getHeaderTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (headerTemplate) return headerTemplate;
    
    if (templateLoadPromise) return templateLoadPromise;
    
    isTemplateLoading = true;
    templateLoadPromise = (async (): Promise<Handlebars.TemplateDelegate> => {
        try {
            const [inputRes, buttonRes, iconRes, headerRes] = await Promise.all([
                fetch('/components/Input/Input.hbs'),
                fetch('/components/FormButton/FormButton.hbs'),
                fetch('/components/Icon/Icon.hbs'),
                fetch('/components/Header/Header.hbs')
            ]);

            if (!Handlebars.partials['input']) {
                const inputSource = await inputRes.text();
                Handlebars.registerPartial('input', Handlebars.compile(inputSource));
            }
            
            if (!Handlebars.partials['button']) {
                const buttonSource = await buttonRes.text();
                Handlebars.registerPartial('button', Handlebars.compile(buttonSource));
            }
            
            if (!Handlebars.partials['icon']) {
                const iconSource = await iconRes.text();
                Handlebars.registerPartial('icon', Handlebars.compile(iconSource));
            }

            const source = await headerRes.text();
            headerTemplate = Handlebars.compile(source);
            return headerTemplate;
            
        } catch (error) {
            templateLoadPromise = null;
            isTemplateLoading = false;
            throw error;
        }
    })();

    return templateLoadPromise;
}

export class Header {
    private headerElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private container: HTMLElement | null = null;

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.init();
    }

    private init(): void {
        loginStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('LOGIN_CHECK_REQUEST');
    }

    async render(container?: HTMLElement): Promise<HTMLElement> {
        if (container) {
            this.container = container;
        }

        const template = await getHeaderTemplate();
        const authState = loginStore.getState();

        const html = template({
            isLoggedIn: authState.isLoggedIn,
            user: authState.user
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        if (this.headerElement && this.headerElement.parentNode) {
            this.headerElement.remove();
        }
        
        this.headerElement = div.firstElementChild as HTMLElement;
        
        if (!this.headerElement) {
            throw new Error('Header element not found');
        }

        this.setupEventHandlers();
        return this.headerElement;
    }

    private async showLoginForm(targetUrl?: string): Promise<void> {
        const loginView = new LoginFormView(targetUrl);
        const modal = await loginView.render();
        document.body.appendChild(modal);
    }

    private setupEventHandlers(): void {
        if (!this.headerElement) return;

        const authState = loginStore.getState();

        const logo = this.headerElement.querySelector('[data-key="logo"]') as HTMLElement;
        if (logo) {
            logo.addEventListener('click', (e: Event) => {
                e.preventDefault();
                this.navigateToHome();
            });
        }

        const userMenu = this.headerElement.querySelector('.user_info_header') as HTMLElement;
            if (userMenu) {
                userMenu.addEventListener('click', async (e: Event) => {
                e.stopPropagation();

                // ПРОВЕРКА АВТОРИЗАЦИИ ПРЯМО ЗДЕСЬ
                if (!authState.isLoggedIn) {
                    // Сохраняем текущий URL для редиректа после логина
                    const currentPath = window.location.pathname + window.location.search;
                    await this.showLoginForm(currentPath);
                    return;
                }

                // Если авторизован - показываем меню как раньше
                const existingMenu = document.querySelector('.popUp-menu');
                if (existingMenu) {
                    existingMenu.remove();
                    return; 
                }

                const popUpMenu = new PopUpMenu({
                    user: authState.user!,
                    menuItems: [
                        { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
                        { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
                        { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
                        { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
                        { key: 'TechSupport', icon: '/img/icons/chat_icon.svg', text: 'Техподдержка' },
                        { key: 'Statistics', icon: '/img/icons/statistics_icon.svg', text: 'Статистика' },
                        { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
                    ]
                });

                const menuEl = await popUpMenu.render();
                const rect = userMenu.getBoundingClientRect();
                menuEl.style.position = 'fixed'; // ← вместо 'absolute'
                menuEl.style.top = `${rect.bottom + 10}px`; // ← учитываем скролл
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

        const createPostButton = this.headerElement.querySelector('button[data-key="createPost"]') as HTMLButtonElement;
        if (createPostButton) {
            if (authState.isLoggedIn) { 
                createPostButton.addEventListener('click', async (e: Event) => {
                    e.preventDefault();
                    const createPostForm = new CreatePostFormView();
                    const formElement = await createPostForm.render();
                    document.body.appendChild(formElement);
                });
            } else {
                createPostButton.addEventListener('click', async (e: Event) => {
                    e.preventDefault();
                    await this.showLoginForm();
                });
            }
        }

        const loginButton = this.headerElement.querySelector('button[data-key="login"]') as HTMLButtonElement;
        if (loginButton && !authState.isLoggedIn) {
            loginButton.addEventListener('click', async (e: Event) => {
                e.preventDefault();
                await this.showLoginForm();
            });
        }
    }

    private navigateToHome(): void {
        router.navigate('/');
    }

    private async handleStoreChange(): Promise<void>  {
        if (this.container && this.headerElement) {
            const newHeader = await this.render();
            this.container.appendChild(newHeader);
        }
    }

    destroy(): void {
        loginStore.removeListener(this.boundStoreHandler);
        if (this.headerElement && this.headerElement.parentNode) {
            this.headerElement.remove();
        }
    }
}