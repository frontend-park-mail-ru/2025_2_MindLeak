let menuItemTemplate = null;

async function getMenuItemTemplate() {
    if (menuItemTemplate) return menuItemTemplate;

    const res = await fetch('/components/MenuItem/MenuItem.hbs');
    const source = await res.text();
    menuItemTemplate = Handlebars.compile(source);
    return menuItemTemplate;
}

export class MenuItem {
    constructor({ key, icon, text }) {
        this.key = key;
        this.icon = icon;
        this.text = text;
    }

    async render() {
        const template = await getMenuItemTemplate();
        const html = template(this);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const menuItemEl = div.firstElementElement;

        const setActive = () => {
            document.querySelectorAll('.menu-item').forEach(el => {
                el.classList.remove('menu-item--active');
            });
            menuItemEl.classList.add('menu-item--active');
        };

        menuItemEl.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`[MenuItem] Выбран: ${this.key}`);
            setActive();
        });

        return menuItemEl;
    }
}