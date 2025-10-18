/**
 * Кэшированный шаблон пользовательского меню
 */
let userMenuTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для свойств UserMenu
 */
interface UserMenuProps {
    name?: string;
    subtitle?: string;
    avatar?: string | null;
    isSubscribed?: boolean;
}

/**
 * Асинхронно загружает шаблон пользовательского меню
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон пользовательского меню
 */
async function getUserMenuTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (userMenuTemplate) return userMenuTemplate;

    const res = await fetch('/components/UserMenu/UserMenu.hbs');
    const source = await res.text();
    userMenuTemplate = Handlebars.compile(source);
    return userMenuTemplate;
}

/**
 * Класс для рендеринга пользовательского меню
 */
export class UserMenu {
    private name: string;
    private subtitle: string;
    private avatar: string | null;
    private isSubscribed: boolean;

    constructor({ name = 'Аккаунт', subtitle = 'тема', avatar = null, isSubscribed = false }: UserMenuProps) {
        this.name = name;
        this.subtitle = subtitle;
        this.avatar = avatar;
        this.isSubscribed = isSubscribed;
    }

    /**
     * Рендерит пользовательское меню
     * @returns {Promise<HTMLElement>} - DOM-элемент пользовательского меню
     */
    async render(): Promise<HTMLElement> {
        const template = await getUserMenuTemplate();
        const html = template({
            name: this.name,
            subtitle: this.subtitle,
            avatar: this.avatar,
            isSubscribed: this.isSubscribed
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const userMenu = div.firstElementChild as HTMLElement;
        
        if (!userMenu) {
            throw new Error('User menu element not found');
        }

        const button = userMenu.querySelector('.user-menu__button') as HTMLButtonElement;
        if (button) {
            button.addEventListener('click', (e: Event) => {
                e.preventDefault();
                if (this.isSubscribed) {
                    console.log('Выход из аккаунта...');
                    window.location.href = '/logout';
                } else {
                    console.log('Показываем форму входа...');
                    import('../LoginForm/LoginForm.js').then(({ LoginForm }) => {
                        new LoginForm().render().then((modal: HTMLElement) => {
                            document.body.appendChild(modal);
                        });
                    });
                }
            });
        }

        return userMenu;
    }
}