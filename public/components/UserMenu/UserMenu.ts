import { PopUpMenu } from '../PopUpMenu/PopUpMenu';
import { LoginForm } from '../LoginForm/LoginForm'; // Статический импорт

let userMenuTemplate: Handlebars.TemplateDelegate | null = null;

interface UserMenuProps {
    name?: string;
    subtitle?: string;
    avatar?: string | null;
    isSubscribed?: boolean;
    isLoggedIn?: boolean;
    hideSubscribeButton?: boolean;
    clickable?: boolean;
}

async function getUserMenuTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (userMenuTemplate) return userMenuTemplate;

    const res = await fetch('/components/UserMenu/UserMenu.hbs');
    const source = await res.text();
    userMenuTemplate = Handlebars.compile(source);
    return userMenuTemplate;
}

export class UserMenu {
    private name: string;
    private subtitle: string;
    private avatar: string | null;
    private isSubscribed: boolean;
    private isLoggedIn: boolean;
    private hideSubscribeButton: boolean;
    private clickable: boolean;

    constructor({ 
        name = 'Аккаунт', 
        subtitle = 'тема', 
        avatar = null, 
        isSubscribed = false,
        isLoggedIn = false,
        hideSubscribeButton = false,
        clickable = true // По умолчанию кликабельный
    }: UserMenuProps) {
        this.name = name;
        this.subtitle = subtitle;
        this.avatar = avatar;
        this.isSubscribed = isSubscribed;
        this.isLoggedIn = isLoggedIn;
        this.hideSubscribeButton = hideSubscribeButton;
        this.clickable = clickable;
    }

    async render(): Promise<HTMLElement> {
        const template = await getUserMenuTemplate();
        const html = template({
            name: this.name,
            subtitle: this.subtitle,
            avatar: this.avatar,
            isSubscribed: this.isSubscribed,
            isLoggedIn: this.isLoggedIn,
            hideSubscribeButton: this.hideSubscribeButton
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const userMenu = div.firstElementChild as HTMLElement;
        
        if (!userMenu) {
            throw new Error('User menu element not found');
        }

        // обработчик клика на весь блок пользователя
        if (this.clickable && this.isLoggedIn) {
            userMenu.style.cursor = 'pointer';
            userMenu.classList.add('user-menu--clickable');
            
            userMenu.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.openUserMenu(userMenu);
            });
        }

        const button = userMenu.querySelector('.user-menu__button') as HTMLButtonElement;
        if (button) {
            button.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (this.isSubscribed) {
                    window.location.href = '/logout';
                } else {
                    const loginForm = new LoginForm();
                    loginForm.render().then((modal: HTMLElement) => {
                        document.body.appendChild(modal);
                    });
                }
            });
        }

        return userMenu;
    }

    private openUserMenu(userMenuElement: HTMLElement): void {
        
        const existingMenu = document.querySelector('.popUp-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const popUpMenu = new PopUpMenu({
            user: {
                name: this.name,
                avatar: this.avatar || '/img/defaultAvatar.jpg',
                subtitle: this.subtitle
            },
            menuItems: [
                { key: 'profile', icon: '/img/icons/profile_icon.svg', text: 'Мой профиль' },
                { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
                { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
                { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
                { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
                { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
            ]
        });

        popUpMenu.render().then(menuElement => {
            const rect = userMenuElement.getBoundingClientRect();
            menuElement.style.position = 'absolute';
            menuElement.style.top = `${rect.bottom + window.scrollY}px`;
            menuElement.style.right = `${window.innerWidth - rect.right}px`;
            menuElement.style.zIndex = '1000';
            
            document.body.appendChild(menuElement);

            const closeMenu = (e: Event) => {
                if (!menuElement.contains(e.target as Node) && e.target !== userMenuElement) {
                    menuElement.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };

            document.addEventListener('click', closeMenu);
        });
    }
}
