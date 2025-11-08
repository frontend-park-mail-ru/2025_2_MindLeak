let menuItemTemplate: Handlebars.TemplateDelegate | null = null;

interface MenuItemProps {
    key: string;
    icon: string;
    text: string;
    topic_id: number;
}

async function getMenuItemTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (menuItemTemplate) return menuItemTemplate;

    const res = await fetch('/components/MenuItem/MenuItem.hbs');
    const source = await res.text();
    menuItemTemplate = Handlebars.compile(source);
    return menuItemTemplate;
}

export class MenuItem {
    private key: string;
    private icon: string;
    private text: string;
    private topic_id: number;

    constructor({ key, icon, text, topic_id }: MenuItemProps) {
        this.key = key;
        this.icon = icon;
        this.text = text;
        this.topic_id = topic_id;
    }

    public toJSON() {
        return {
            key: this.key,
            icon: this.icon,
            text: this.text,
            topic_id: this.topic_id,
        };
    }

    async render(): Promise<HTMLElement> {
        const template = await getMenuItemTemplate();
        const html = template(this.toJSON());

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
            setActive();
        });

        return menuItemEl;
    }
}