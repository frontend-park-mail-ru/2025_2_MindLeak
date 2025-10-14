/**
 * Кэшированный шаблон элемента меню
 */
let menuItemTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для свойств элемента меню
 */
interface MenuItemProps {
    key: string;
    icon: string;
    text: string;
}

/**
 * Асинхронно загружает шаблон элемента меню
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон элемента меню
 */
async function getMenuItemTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (menuItemTemplate) return menuItemTemplate;

    const res = await fetch('/components/MenuItem/MenuItem.hbs');
    const source = await res.text();
    menuItemTemplate = Handlebars.compile(source);
    return menuItemTemplate;
}

/**
 * Класс для рендеринга элемента меню
 */
export class MenuItem {
    private key: string;
    private icon: string;
    private text: string;

    constructor({ key, icon, text }: MenuItemProps) {
        this.key = key;
        this.icon = icon;
        this.text = text;
    }

    /**
     * Рендерит элемент меню
     * @returns {Promise<HTMLElement>} - DOM-элемент элемента меню
     */
    async render(): Promise<HTMLElement> {
        const template = await getMenuItemTemplate();
        const html = template(this);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const menuItemEl = div.firstElementChild as HTMLElement;
        
        if (!menuItemEl) {
            throw new Error('Menu item element not found');
        }

        const setActive = () => {
            document.querySelectorAll('.menu-item').forEach(el => {
                el.classList.remove('menu-item--active');
            });
            menuItemEl.classList.add('menu-item--active');
        };

        menuItemEl.addEventListener('click', (e: Event) => {
            e.preventDefault();
            console.log(`[MenuItem] Выбран: ${this.key}`);
            setActive();
        });

        return menuItemEl;
    }
}