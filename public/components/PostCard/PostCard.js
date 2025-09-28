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
        const MAX_TITLE_LENGTH = 60;
        const MAX_TEXT_LENGTH = 200;

        // Обрезаем заголовок
        const titleTruncated = this.title.length > MAX_TITLE_LENGTH
            ? this.title.substring(0, MAX_TITLE_LENGTH)
            : null;

        // Обрезаем текст
        const textTruncated = this.text.length > MAX_TEXT_LENGTH
            ? this.text.substring(0, MAX_TEXT_LENGTH)
            : null;

        const template = await getPostCardTemplate();
        const html = template({
            user: this.user,
            title: this.title,
            titleTruncated: titleTruncated,
            text: this.text,
            textTruncated: textTruncated,
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

        // === Обработчик для текста ===
        const toggleTextBtn = postCard.querySelector('[data-key="toggle-text"]');
        const textPreview = postCard.querySelector('.post-card__text-preview');
        const textFull = postCard.querySelector('.post-card__text-full');

        if (toggleTextBtn && textPreview && textFull) {
            let isExpanded = false;
            toggleTextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isExpanded = !isExpanded;
                textPreview.hidden = isExpanded;
                textFull.hidden = !isExpanded;
                toggleTextBtn.textContent = isExpanded ? 'Скрыть' : 'Показать полностью';
            });
        }

        // === Обработчик для заголовка (опционально) ===
        const titleEl = postCard.querySelector('.post-card__title');
        if (titleTruncated) {
            let isTitleExpanded = false;
            titleEl.style.cursor = 'pointer';
            titleEl.title = 'Кликните, чтобы увидеть весь заголовок';

            titleEl.addEventListener('click', () => {
                isTitleExpanded = !isTitleExpanded;
                if (isTitleExpanded) {
                    titleEl.textContent = this.title;
                    titleEl.title = 'Кликните, чтобы свернуть';
                } else {
                    titleEl.innerHTML = `${this.title.substring(0, MAX_TITLE_LENGTH)}...`;
                    titleEl.title = 'Кликните, чтобы увидеть весь заголовок';
                }
            });
        }

        return postCard;
    }
}