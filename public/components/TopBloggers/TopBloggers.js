let topBloggersTemplate = null;

async function getTopBloggersTemplate() {
    if (topBloggersTemplate) return topBloggersTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const iconRes = await fetch('/components/Icon/Icon.hbs');
    const iconSource = await iconRes.text();
    Handlebars.registerPartial('icon', Handlebars.compile(iconSource));

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
    { name: 'Аккаунт 7', subtitle: '220,5k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 8', subtitle: '215,9k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 9', subtitle: '210,2k подписчиков', avatar: '/img/defaultAvatar.jpg' },
    { name: 'Аккаунт 10', subtitle: '205,6k подписчиков', avatar: '/img/defaultAvatar.jpg' }
];

export class TopBloggers {
    constructor({ bloggers = DEFAULT_BLOGGERS } = {}) {
        this.bloggers = bloggers;
        this.isExpanded = false;
    }

    async render() {
        const template = await getTopBloggersTemplate();
        
        const displayedBloggers = this.bloggers.slice(0, 3);
        const html = template({ bloggers: displayedBloggers });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const topBloggers = div.firstElementChild;

        this.element = topBloggers;
        this.listElement = topBloggers.querySelector('.top-bloggers__list');
        this.viewAllBtn = topBloggers.querySelector('[data-key="view-all"]');
        this.buttonText = this.viewAllBtn.querySelector('.button-text');
        this.icon = this.viewAllBtn.querySelector('img');

        this.viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleView();
        });

        return topBloggers;
    }

    toggleView() {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            const fullHtml = topBloggersTemplate({ bloggers: this.bloggers });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fullHtml.trim();
            const expandedList = tempDiv.querySelector('.top-bloggers__list');
            
            this.listElement.replaceWith(expandedList);
            this.listElement = expandedList;
            
            this.buttonText.textContent = 'Свернуть';
            this.icon.src = '/img/icons/arrowUp_icon.svg';
            this.icon.alt = 'Свернуть';
            this.icon.title = 'Свернуть';
            
        } else {
            const collapsedHtml = topBloggersTemplate({ bloggers: this.bloggers.slice(0, 3) });
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = collapsedHtml.trim();
            const collapsedList = tempDiv.querySelector('.top-bloggers__list');
            
            this.listElement.replaceWith(collapsedList);
            this.listElement = collapsedList;
            
            this.buttonText.textContent = 'Просмотреть весь топ';
            this.icon.src = '/img/icons/arrowDown_icon.svg';
            this.icon.alt = 'Развернуть';
            this.icon.title = 'Развернуть';
        }
    }
}