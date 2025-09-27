let postCardTemplate = null;

async function getPostCardTemplate() {
    if (postCardTemplate) return postCardTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const tagRes = await fetch('/components/Tag/Tag.hbs');
    const tagSource = await tagRes.text();
    Handlebars.registerPartial('tag', Handlebars.compile(tagSource));

    const iconRes = await fetch('/components/Icon/Icon.hbs');
    const iconSource = await iconRes.text();
    Handlebars.registerPartial('icon', Handlebars.compile(iconSource));

    const res = await fetch('/components/PostCard/PostCard.hbs');
    const source = await res.text();
    postCardTemplate = Handlebars.compile(source);
    return postCardTemplate;
}

export class PostCard {
    constructor({
        user = { name: 'Аккаунт', subtitle: 'тема', avatar: null, isSubscribed: false },
        title = 'Большой заголовок поста',
        text = 'Текст поста поменьше',
        link = '',
        linkText = 'ссылка',
        image = null,
        tags = ['тег1', 'тег2', 'тег3'],
        commentsCount = 123,
        repostsCount = 42,
        viewsCount = 42
    }) {
        this.user = user;
        this.title = title;
        this.text = text;
        this.link = link;
        this.linkText = linkText;
        this.image = image;
        this.tags = tags;
        this.commentsCount = commentsCount;
        this.repostsCount = repostsCount;
        this.viewsCount = viewsCount;
    }

    async render() {
        const template = await getPostCardTemplate();
        const html = template({
            user: this.user,
            title: this.title,
            text: this.text,
            link: this.link,
            linkText: this.linkText,
            image: this.image,
            tags: this.tags,
            commentsCount: this.commentsCount,
            repostsCount: this.repostsCount,
            viewsCount: this.viewsCount
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const postCard = div.firstElementChild;

        return postCard;
    }
}