/**
 * Кэшированный шаблон popup меню
 */
let popUpMenuTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для элемента меню
 */
interface MenuItem {
    key: string;
    icon: string;
    text: string;
}

/**
 * Интерфейс для пользователя
 */
interface User {
    name: string;
    avatar: string;
    subtitle?: string;
}

/**
 * Интерфейс для свойств PopUpMenu
 */
interface PopUpMenuProps {
    user: User;
    menuItems?: MenuItem[];
}

/**
 * Асинхронно загружает шаблон popup меню с зависимыми partials
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон popup меню
 */
async function getPopUpMenuTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (popUpMenuTemplate) return popUpMenuTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const menuItemRes = await fetch('/components/MenuItem/MenuItem.hbs');
    const menuItemSource = await menuItemRes.text();
    Handlebars.registerPartial('menu-item', Handlebars.compile(menuItemSource));

    const res = await fetch('/components/PopUpMenu/PopUpMenu.hbs');
    const source = await res.text();
    popUpMenuTemplate = Handlebars.compile(source);
    return popUpMenuTemplate;
}

/**
 * Обрабатывает выход пользователя
 */
function handleLogout(): void {
    console.log('Попытка выхода...');
    fetch('https://mindleak.ru/api/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => {
        if (res.ok) {
            console.log('Выход успешен!');
            window.location.reload();
        } else {
            console.error('Ошибка при выходе:', res.status);
            alert('Не удалось выйти');
        }
    })
    .catch(err => {
        console.error('Сеть недоступна:', err);
        alert('Не удалось выйти. Проверьте подключение.');
    });
}

/**
 * Класс для рендеринга popup меню
 */
export class PopUpMenu {
    private user: User;
    private menuItems: MenuItem[];

    constructor({ user, menuItems }: PopUpMenuProps) {
        this.user = user;
        this.menuItems = menuItems || [
            { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
            { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
            { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
            { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
            { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
        ];
    }

    /**
     * Рендерит popup меню
     * @returns {Promise<HTMLElement>} - DOM-элемент popup меню
     */
    async render(): Promise<HTMLElement> {
        const template = await getPopUpMenuTemplate();
        const html = template({
            user: this.user,
            menuItems: this.menuItems
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const popUpMenu = div.firstElementChild as HTMLElement;
        
        if (!popUpMenu) {
            throw new Error('Popup menu element not found');
        }

        const menuItems = popUpMenu.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const key = (item as HTMLElement).dataset.key;

                console.log(`[PopUpMenu] Клик по пункту: ${key}`);

                if (popUpMenu.parentNode) {
                    popUpMenu.remove();
                }

                if (key === 'logout') {
                    handleLogout();
                }
            });
        });

        popUpMenu.addEventListener('click', (e: Event) => {
            e.stopPropagation();
        });

        return popUpMenu;
    }
}