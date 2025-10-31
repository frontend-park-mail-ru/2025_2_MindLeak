/**
 * Кэшированный шаблон бокового меню
 */
let sidebarTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для элемента меню
 */
interface MenuItem {
    key: string;
    icon: string;
    text: string;
}

/**
 * Константы пунктов меню
 */
const MENU_ITEMS: MenuItem[] = [
    { key: 'fresh', icon: '/img/icons/Fresh_icon.svg', text: 'Свежее' },
    { key: 'trends', icon: '/img/icons/trends_icon.svg', text: 'Тренды' },
    { key: 'feed', icon: '/img/icons/feed_icon.svg', text: 'Лента' },
    { key: 'messages', icon: '/img/icons/chat_icon.svg', text: 'Сообщения' }
];

/**
 * Текущий активный ключ меню
 */
let currentActiveKey: string = 'fresh';

/**
 * Асинхронно загружает шаблон бокового меню с зависимыми partials
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон бокового меню
 */
async function getSidebarTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (sidebarTemplate) return sidebarTemplate;

    const menuItemRes = await fetch('/components/MenuItem/MenuItem.hbs');
    const menuItemSource = await menuItemRes.text();
    Handlebars.registerPartial('menu-item', Handlebars.compile(menuItemSource));

    const res = await fetch('/components/SidebarMenu/SidebarMenu.hbs');
    const source = await res.text();
    sidebarTemplate = Handlebars.compile(source);
    return sidebarTemplate;
}

/**
 * Класс для рендеринга бокового меню
 */
export class SidebarMenu {
    /**
     * Рендерит боковое меню
     * @returns {Promise<HTMLElement>} - DOM-элемент бокового меню
     */
    async render(): Promise<HTMLElement> {
        const template = await getSidebarTemplate();
        const html = template({ menuItems: MENU_ITEMS });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const sidebar = div.firstElementChild as HTMLElement;
        
        if (!sidebar) {
            throw new Error('Sidebar element not found');
        }

        const setActiveItem = (key: string) => {
            currentActiveKey = key;
            sidebar.querySelectorAll('.menu-item').forEach(item => {
                item.classList.toggle('menu-item--active', (item as HTMLElement).dataset.key === key);
            });
        };

        setActiveItem('fresh');

        const menuItems = sidebar.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const key = (item as HTMLElement).dataset.key;

                console.log(`[Sidebar] Переключение на раздел: ${key}`);

                setActiveItem(key);

                // to do переделать заглушку и переключать странички
            });
        });

        return sidebar;
    }
}

export { currentActiveKey };