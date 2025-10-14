let topBloggersTemplate = null;

async function getTopBloggersTemplate() {
    if (topBloggersTemplate) return topBloggersTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const res = await fetch('/components/TopBloggers/TopBloggers.hbs');
    const source = await res.text();
    topBloggersTemplate = Handlebars.compile(source);
    return topBloggersTemplate;
}

const DEFAULT_BLOGGERS = [
    { name: 'Аккаунт 1', subtitle: '250,4k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 2', subtitle: '245,2k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 3', subtitle: '240,1k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 4', subtitle: '235,7k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 5', subtitle: '230,3k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 6', subtitle: '225,8k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 7', subtitle: '220,5k подписчиков', avatar: '/img/defaultAvatar.jpg' }
];

export class TopBloggers {
    constructor({ bloggers = DEFAULT_BLOGGERS } = {}) {
        this.bloggers = bloggers;
    }

    async render() {
        const template = await getTopBloggersTemplate();
        
        const displayedBloggers = this.bloggers.slice(0, 7);
        const html = template({ bloggers: displayedBloggers });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const topBloggers = div.firstElementChild;

        return topBloggers;
    }
}