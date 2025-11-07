let sidebarTemplate: Handlebars.TemplateDelegate | null = null;

export interface MenuItem {
    key: string;
    icon: string;
    text: string;
    topic_id: number;
}

export const MAIN_MENU_ITEMS: MenuItem[] = [
    { topic_id: 11, key: 'fresh', icon: '/img/icons/Fresh_icon.svg', text: 'Свежее' },
    { topic_id: 12, key: 'trends', icon: '/img/icons/trends_icon.svg', text: 'Тренды' },
    { topic_id: 13, key: 'feed', icon: '/img/icons/feed_icon.svg', text: 'Лента' },
    { topic_id: 14, key: 'messages', icon: '/img/icons/chat_icon.svg', text: 'Сообщения' }
];

export const SECONDARY_MENU_ITEMS: MenuItem[] = [
    { topic_id: 1, key: 'services', icon: '/img/icons/services_icon.svg', text: 'Сервисы' },
    { topic_id: 2, key: 'marketing', icon: '/img/icons/marketing_icon.svg', text: 'Маркетинг' },
    { topic_id: 3, key: 'money', icon: '/img/icons/money_icon.svg', text: 'Деньги' },
    { topic_id: 4, key: 'travel', icon: '/img/icons/travel_icon.svg', text: 'Путешествия' },
    { topic_id: 5, key: 'ai', icon: '/img/icons/AI_icon.svg', text: 'AI' },
    { topic_id: 6, key: 'personal-exp', icon: '/img/icons/person-exp_icon.svg', text: 'Личный опыт' },
    { topic_id: 7, key: 'invest', icon: '/img/icons/invest_icon.svg', text: 'Инвестиции' },
    { topic_id: 8, key: 'career', icon: '/img/icons/career_icon.svg', text: 'Карьера' },
    { topic_id: 9, key: 'edu', icon: '/img/icons/edu_icon.svg', text: 'Образование' },
];

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

export class SidebarMenu {
    private currentActiveKey: string;
    private readonly menuItems: MenuItem[];
    private readonly onSelect: (key: string) => void;

    constructor(
        menuItems: MenuItem[],
        defaultActiveKey: string = 'fresh',
        onSelect: (key: string) => void = () => {}
    ) {
        this.menuItems = menuItems;
        this.currentActiveKey = defaultActiveKey;
        this.onSelect = onSelect;
    }

    async render(): Promise<HTMLElement> {
        const template = await getSidebarTemplate();
        const html = template({ menuItems: this.menuItems });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const sidebar = div.firstElementChild as HTMLElement;
        
        if (!sidebar) {
            throw new Error('Sidebar element not found');
        }

        const setActiveItem = (key: string) => {
            this.currentActiveKey = key;
            sidebar.querySelectorAll('.menu-item').forEach(item => {
                item.classList.toggle('menu-item--active', (item as HTMLElement).dataset.key === key);
            });
        };

        setActiveItem(this.currentActiveKey);

        const menuItems = sidebar.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const key = (item as HTMLElement).dataset.key;
                if (!key) return;

                console.log(`[Sidebar] Переключение на раздел: ${key}`);
                setActiveItem(key);
                this.onSelect(key);
            });
        });

        return sidebar;
    }
}