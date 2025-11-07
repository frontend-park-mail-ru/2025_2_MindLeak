import { PostCardMenu } from '../PostCardMenu/PostCardMenu';
import { dispatcher } from '../../dispatcher/dispatcher';
import { router } from '../../router/router';

let postCardTemplate: Handlebars.TemplateDelegate | null = null;

export interface PostAuthor {
    name: string;
    subtitle: string;
    avatar: string | null;
    isSubscribed: boolean;
    id?: number;
}

export interface PostCardProps {
    postId: string;
    authorId?: number;
    user?: PostAuthor;
    title?: string;
    text?: string;
    link?: string;
    linkText?: string;
    tags?: string[];
    commentsCount?: number;
    repostsCount?: number;
    viewsCount?: number;
    isOwnPost: boolean;
    onMenuAction?: (action: string) => void;
}

async function getPostCardTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (postCardTemplate) return postCardTemplate;

    const partials = [
        { name: 'user-menu', path: '/components/UserMenu/UserMenu.hbs' },
        { name: 'tag', path: '/components/Tag/Tag.hbs' },
        { name: 'icon', path: '/components/Icon/Icon.hbs' },
        { name: 'menu-item', path: '/components/MenuItem/MenuItem.hbs' },
        { name: 'post-card-menu', path: '/components/PostCardMenu/PostCardMenu.hbs' }
    ];

    await Promise.all(
        partials.map(async (p) => {
            if (!Handlebars.partials[p.name]) {
                const res = await fetch(p.path);
                const src = await res.text();
                Handlebars.registerPartial(p.name, Handlebars.compile(src));
            }
        })
    );

    const res = await fetch('/components/PostCard/PostCard.hbs');
    const source = await res.text();
    postCardTemplate = Handlebars.compile(source);
    return postCardTemplate;
}

export class PostCard {
    private postId: string;
    private user: PostAuthor;
    private title: string;
    private text: string;
    private link: string;
    private linkText: string;
    private tags: string[];
    private commentsCount: number;
    private repostsCount: number;
    private viewsCount: number;
    private menuId: string;
    private isOwnPost: boolean;
    private onMenuAction?: (action: string) => void;

    constructor(props: PostCardProps) {
        this.postId = props.postId;

        const {
            user = { name: 'Аккаунт', subtitle: 'тема', avatar: null, isSubscribed: false },
            title = 'Большой заголовок поста',
            text = 'Текст поста поменьше',
            link = '',
            linkText = 'ссылка',
            tags = ['тег1', 'тег2', 'тег3'],
            commentsCount = 123,
            repostsCount = 42,
            viewsCount = 42,
            isOwnPost = false
        } = props;

        this.user = user;
        this.title = title;
        this.text = text;
        this.link = link;
        this.linkText = linkText;
        this.tags = tags;
        this.commentsCount = commentsCount;
        this.repostsCount = repostsCount;
        this.viewsCount = viewsCount;
        this.menuId = `post-card-menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.isOwnPost = isOwnPost;
        this.onMenuAction = props.onMenuAction;
    }

    async render(): Promise<HTMLElement> {
        const MAX_TEXT_LENGTH = 200;

        const textTruncated = this.text.length > MAX_TEXT_LENGTH
            ? this.text.substring(0, MAX_TEXT_LENGTH)
            : null;

        let menuItems = [
            { key: 'hide', text: 'Скрыть' },
            { key: 'report', text: 'Пожаловаться' }
        ];
                
        if (this.isOwnPost) {
            menuItems = [
                { key: 'edit', text: 'Редактировать' },
                { key: 'delete', text: 'Удалить' },
                ...menuItems
            ];
        }

        const template = await getPostCardTemplate();
        const html = template({
            user: this.user,
            title: this.title,          
            text: this.text,
            textTruncated: textTruncated,
            link: this.link,
            linkText: this.linkText,
            tags: this.tags,
            commentsCount: this.commentsCount,
            repostsCount: this.repostsCount,
            viewsCount: this.viewsCount,
            menuId: this.menuId,
            menuItems: menuItems 
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
        if (titleEl) {
            titleEl.style.cursor = 'pointer';
            titleEl.title = 'Открыть пост';

            titleEl.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();

                const postUrl = `/post/${this.postId}`;
                window.history.pushState({}, '', postUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }

        const menuButton = postCard.querySelector('.post-card__menu-button') as HTMLElement;
        const menuPopup = postCard.querySelector('.post-card-menu') as HTMLElement;

        if (menuButton && menuPopup) {
            new PostCardMenu(menuButton, menuPopup);
        }

        const menuItemsElements = postCard.querySelectorAll('.post-card-menu [data-key]');
        menuItemsElements.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const key = item.getAttribute('data-key');
                if (key) {
                    if (key === 'edit') {
                        dispatcher.dispatch('POST_EDIT_REQUEST', { postId: this.postId });
                    } else {
                        this.onMenuAction?.(key);
                    }
                }
            });
        });

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
            
            console.log(`[PostCard] Переход в профиль автора: ${this.user.name}, ${this.user.id}`);
            
            if (this.user.id) {
                // 1. Навигация через роутер (ОБЯЗАТЕЛЬНО!)
                router.navigate(`/profile?id=${this.user.id}`);
                
                // 2. Загрузка данных (опционально - ProfileView сам загрузит)
                // dispatcher.dispatch('PROFILE_LOAD_REQUEST', { 
                //     userId: this.user.id.toString() 
                // });
            } else {
                console.warn('Author ID not available');
            }
        };

        // Вешаем обработчики на все элементы автора
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

        // И на весь блок user-menu
        const userMenuBlock = postCard.querySelector('.user-menu') as HTMLElement;
        if (userMenuBlock) {
            userMenuBlock.style.cursor = 'pointer';
            userMenuBlock.addEventListener('click', (e: Event) => {
                if (subscribeButton && subscribeButton.contains(e.target as Node)) {
                    return; // Не нажимать на кнопку подписки
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