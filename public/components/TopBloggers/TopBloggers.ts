/**
 * Кэшированный шаблон топ блогеров
 */
let topBloggersTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Интерфейс для блогера
 */
interface Blogger {
    name: string;
    subtitle: string;
    avatar: string;
}

/**
 * Интерфейс для свойств TopBloggers
 */
interface TopBloggersProps {
    bloggers?: Blogger[];
}

/**
 * Константы блогеров по умолчанию
 */
const DEFAULT_BLOGGERS: Blogger[] = [
    { name: 'Аккаунт 1', subtitle: '250,4k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 2', subtitle: '245,2k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 3', subtitle: '240,1k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 4', subtitle: '235,7k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 5', subtitle: '230,3k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 6', subtitle: '225,8k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 7', subtitle: '220,5k подписчиков', avatar: '/img/defaultAvatar.jpg' }
];

/**
 * Асинхронно загружает шаблон топ блогеров с зависимыми partials
 * @returns {Promise<Handlebars.TemplateDelegate>} - скомпилированный Handlebars-шаблон топ блогеров
 */
async function getTopBloggersTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (topBloggersTemplate) return topBloggersTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const res = await fetch('/components/TopBloggers/TopBloggers.hbs');
    const source = await res.text();
    topBloggersTemplate = Handlebars.compile(source);
    return topBloggersTemplate;
}

/**
 * Класс для рендеринга топ блогеров
 */
export class TopBloggers {
    private bloggers: Blogger[];

    constructor({ bloggers = DEFAULT_BLOGGERS }: TopBloggersProps = {}) {
        this.bloggers = bloggers;
    }

    /**
     * Рендерит топ блогеров
     * @returns {Promise<HTMLElement>} - DOM-элемент топ блогеров
     */
    async render(): Promise<HTMLElement> {
        const template = await getTopBloggersTemplate();
        
        const displayedBloggers = this.bloggers.slice(0, 7);
        const html = template({ bloggers: displayedBloggers });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const topBloggers = div.firstElementChild as HTMLElement;
        
        if (!topBloggers) {
            throw new Error('Top bloggers element not found');
        }

        return topBloggers;
    }
}
