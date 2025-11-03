let postCardTemplate: Handlebars.TemplateDelegate | null = null;

interface User {
    name: string;
    subtitle: string;
    avatar: string | null;
    isSubscribed: boolean;
    id?: number;
}

export interface PostCardProps {
    user?: User;
    title?: string;
    text?: string;
    link?: string;
    linkText?: string;
    image?: string | null;
    tags?: string[];
    commentsCount?: number;
    repostsCount?: number;
    viewsCount?: number;
}

async function getPostCardTemplate(): Promise<Handlebars.TemplateDelegate> {
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
    private user: User;
    private title: string;
    private text: string;
    private link: string;
    private linkText: string;
    private image: string | null;
    private tags: string[];
    private commentsCount: number;
    private repostsCount: number;
    private viewsCount: number;

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
    }: PostCardProps) {
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

    async render(): Promise<HTMLElement> {
        const MAX_TITLE_LENGTH = 60;
        const MAX_TEXT_LENGTH = 200;

        const titleTruncated = this.title.length > MAX_TITLE_LENGTH
            ? this.title.substring(0, MAX_TITLE_LENGTH)
            : null;

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
        const postCard = div.firstElementChild as HTMLElement;
        
        if (!postCard) {
            throw new Error('Post card element not found');
        }

        this.setupAuthorClickHandlers(postCard);

        const toggleTextBtn = postCard.querySelector('[data-key="toggle-text"]') as HTMLElement;
        const textPreview = postCard.querySelector('.post-card__text-preview') as HTMLElement;
        const textFull = postCard.querySelector('.post-card__text-full') as HTMLElement;

        if (toggleTextBtn && textPreview && textFull) {
            let isExpanded = false;
            toggleTextBtn.addEventListener('click', (e: Event) => {
                e.preventDefault();
                isExpanded = !isExpanded;
                textPreview.hidden = isExpanded;
                textFull.hidden = !isExpanded;
                toggleTextBtn.textContent = isExpanded ? 'Скрыть' : 'Показать полностью';
            });
        }

        const titleEl = postCard.querySelector('.post-card__title') as HTMLElement;
        if (titleTruncated && titleEl) {
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

    private setupAuthorClickHandlers(postCard: HTMLElement): void {
        const authorAvatar = postCard.querySelector('.user-menu__avatar') as HTMLElement;
        const authorName = postCard.querySelector('.user-menu__name') as HTMLElement;
        const authorSubtitle = postCard.querySelector('.user-menu__subtitle') as HTMLElement;
        const subscribeButton = postCard.querySelector('.user-menu__button') as HTMLElement;

        const navigateToProfile = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`[PostCard] Переход в профиль автора: ${this.user.name}`, this.user.id);
            
            let profileUrl = '/profile';
            if (this.user.id) {
                profileUrl += `?id=${this.user.id}`;
            }
            
            window.history.pushState({}, '', profileUrl);
            window.dispatchEvent(new PopStateEvent('popstate'));
        };

        if (authorAvatar) {
            authorAvatar.style.cursor = 'pointer';
            authorAvatar.addEventListener('click', navigateToProfile);
        }

        if (authorName) {
            authorName.style.cursor = 'pointer';
            authorName.addEventListener('click', navigateToProfile);
        }

        if (authorSubtitle) {
            authorSubtitle.style.cursor = 'pointer';
            authorSubtitle.addEventListener('click', navigateToProfile);
        }

        const userMenuBlock = postCard.querySelector('.user-menu') as HTMLElement;
        if (userMenuBlock) {
            userMenuBlock.style.cursor = 'pointer';
            userMenuBlock.addEventListener('click', (e: Event) => {
                if (subscribeButton && subscribeButton.contains(e.target as Node)) {
                    return;
                }
                navigateToProfile(e);
            });
        }

        if (subscribeButton) {
            subscribeButton.addEventListener('click', (e: Event) => {
                e.stopPropagation();
            });
        }
    }
}