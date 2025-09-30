let sidebarTemplate = null;

async function getSidebarTemplate() {
    if (sidebarTemplate) return sidebarTemplate;

    const menuItemRes = await fetch('/components/MenuItem/MenuItem.hbs');
    const menuItemSource = await menuItemRes.text();
    Handlebars.registerPartial('menu-item', Handlebars.compile(menuItemSource));

    const res = await fetch('/components/SidebarMenu/SidebarMenu.hbs');
    const source = await res.text();
    sidebarTemplate = Handlebars.compile(source);
    return sidebarTemplate;
}

const MENU_ITEMS = [
    { key: 'fresh', icon: '/img/icons/Fresh_icon.svg', text: 'Свежее' },
    { key: 'trends', icon: '/img/icons/trends_icon.svg', text: 'Тренды' },
    { key: 'feed', icon: '/img/icons/feed_icon.svg', text: 'Лента' },
    { key: 'messages', icon: '/img/icons/chat_icon.svg', text: 'Сообщения' }
];

let currentActiveKey = 'fresh';

export class SidebarMenu {
    async render() {
        const template = await getSidebarTemplate();
        const html = template({ menuItems: MENU_ITEMS });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const sidebar = div.firstElementChild; 

        const setActiveItem = (key) => {
            currentActiveKey = key;
            sidebar.querySelectorAll('.menu-item').forEach(item => {
                item.classList.toggle('menu-item--active', item.dataset.key === key);
            });
        };

        setActiveItem('fresh');

        const menuItems = sidebar.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const key = item.dataset.key;

                console.log(`[Sidebar] Переключение на раздел: ${key}`);

                setActiveItem(key);

                // to do переделать заглушку и переключать странички
            });
        });

        return sidebar;
    }
}

export { currentActiveKey };