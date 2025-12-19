// components/PostCard/PostCard.ts
import { PostCardMenu } from '../PostCardMenu/PostCardMenu';
import { dispatcher } from '../../dispatcher/dispatcher';
import { router } from '../../router/router';
import { loginStore } from '../../stores/storeLogin';
import { LoginFormView } from '../../views/viewLogin';
import { HashtagParser } from '../../utils/hashtagParser';

let postCardTemplate: Handlebars.TemplateDelegate | null = null;

export interface PostAuthor {
    name: string;
    subtitle: string;
    avatar: string | null;
    isSubscribed: boolean;
    id?: number;
    hideSubscribeButton?: boolean;
    isMyProfile?: boolean;
}

export interface PostCardProps {
    postId: string;
    authorId?: number;
    user?: PostAuthor;
    title?: string;
    text?: string;
    link?: string;
    linkText?: string;
    image?: string;
    tags?: string[];
    commentsCount?: number;
    repostsCount?: number;
    viewsCount?: number;
    isOwnPost: boolean;
    canEdit?: boolean;
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
    private image: string;
    private tags: string[];
    private commentsCount: number;
    private repostsCount: number;
    private viewsCount: number;
    private menuId: string;
    private isOwnPost: boolean;
    private canEdit: boolean;
    private onMenuAction?: (action: string) => void;

    constructor(props: PostCardProps) {
        this.postId = props.postId;
        this.image = props.image || '';

        const {
            user = { 
                name: 'Аккаунт', 
                subtitle: 'тема', 
                avatar: null, 
                isSubscribed: false,
                hideSubscribeButton: false, // ← Добавить значение по умолчанию
                isMyProfile: false // ← И это тоже
            },
            title = 'Большой заголовок поста',
            text = 'Текст поста поменьше',
            link = '',
            linkText = 'ссылка',
            tags = ['тег1', 'тег2', 'тег3'],
            commentsCount = 123,
            repostsCount = 42,
            viewsCount = 42,
            isOwnPost = false,
            canEdit = false
        } = props;

        this.user = {
            ...user,
            hideSubscribeButton: user.hideSubscribeButton || false, // Сохраняем флаг
            isMyProfile: user.isMyProfile || false // Сохраняем если есть
        };
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
        this.canEdit = canEdit;
        this.onMenuAction = props.onMenuAction;
    }

    async render(): Promise<HTMLElement> {
        const MAX_TEXT_LENGTH = 200;

        // Обрабатываем хештеги в тексте и заголовке
        const processedTitle = HashtagParser.replaceHashtagsWithLinks(this.title);
        const processedText = HashtagParser.replaceHashtagsWithLinks(this.text);
        
        const textTruncated = this.text.length > MAX_TEXT_LENGTH
            ? HashtagParser.replaceHashtagsWithLinks(this.text.substring(0, MAX_TEXT_LENGTH))
            : null;

        let menuItems = [
            { key: 'hide', text: 'Скрыть' },
            { key: 'report', text: 'Пожаловаться' }
        ];
                
        if (this.isOwnPost) {
            menuItems = [
                { key: 'edit', text: 'Редактировать' },
                { key: 'delete', text: 'Удалить' },
                //...menuItems
            ];
        }

        const template = await getPostCardTemplate();
        const html = template({
            user: this.user,
            title: processedTitle,           // Используем обработанный заголовок с хештегами
            text: processedText,             // Используем обработанный текст с хештегами
            textTruncated: textTruncated,
            link: this.link,
            linkText: this.linkText,
            image: this.image,
            tags: this.tags,
            commentsCount: this.commentsCount,
            repostsCount: this.repostsCount,
            viewsCount: this.viewsCount,
            menuId: this.menuId,
            menuItems: menuItems,
            canEdit: this.canEdit
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const postCard = div.firstElementChild as HTMLElement;
        
        if (!postCard) {
            throw new Error('Post card element not found');
        }

        this.setupAuthorClickHandlers(postCard);
        this.setupHashtagHandlers(postCard); // Добавляем обработчики для хештегов

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

        const commentsIcon = postCard.querySelector('.tag[data-key="comments"]') as HTMLElement;
        if (commentsIcon) {
            commentsIcon.style.cursor = 'pointer';
            commentsIcon.title = 'Открыть пост';
            commentsIcon.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                router.navigate(`/post/${this.postId}`);
            });
        }

        const menuButton = postCard.querySelector('.post-card__menu-button') as HTMLElement;
        const menuPopup = postCard.querySelector('.post-card-menu') as HTMLElement;

        if (menuButton && menuPopup) {
            // Передаем колбэк для обработки действий меню
            new PostCardMenu(menuButton, menuPopup, this.postId, (key: string, postId: string) => {
                this.handleMenuAction(key, postId);
            });
        }

        return postCard;
    }

    private setupHashtagHandlers(postCard: HTMLElement): void {
        const hashtagLinks = postCard.querySelectorAll('.hashtag-link');
        
        hashtagLinks.forEach(link => {
            link.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                const hashtag = link.getAttribute('data-hashtag');
                if (hashtag) {
                    this.handleHashtagClick(hashtag);
                }
            });
        });
    }

    private handleHashtagClick(hashtag: string): void {
        // Навигация на страницу поиска с хештегом
        router.navigate(`/search?q=%23${encodeURIComponent(hashtag)}`);
    }

    private handleMenuAction(key: string, postId: string): void {
        
        switch (key) {
            case 'edit':
                this.handleEditPost();
                break;
            default:
                this.onMenuAction?.(key);
        }
    }

    private async handleEditPost(): Promise<void> {
        // Отправляем запрос на загрузку данных поста для редактирования
        dispatcher.dispatch('POST_EDIT_REQUEST', { postId: this.postId });
        
    }

    private setupAuthorClickHandlers(postCard: HTMLElement): void {
        const authorAvatar = postCard.querySelector('.user-menu__avatar') as HTMLElement;
        const authorName = postCard.querySelector('.user-menu__name') as HTMLElement;
        const authorSubtitle = postCard.querySelector('.user-menu__subtitle') as HTMLElement;
        const subscribeButton = postCard.querySelector('.user-menu__button') as HTMLElement;

        const navigateToProfile = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            
            
            const authState = loginStore.getState();
            const authorId = this.user.id;
            
            if (!authorId) {
                return;
            }
            
            const targetUrl = `/profile?id=${authorId}`;
            
            if (!authState.isLoggedIn) {
                // Показываем форму логина с редиректом на профиль автора
                this.showLoginForm(targetUrl);
            } else {
                // Переходим сразу на профиль
                router.navigate(targetUrl);
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
        if (subscribeButton) {
            subscribeButton.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                this.handleSubscribeAction(subscribeButton);
            });
        }
        
        // Обновляем navigateToProfile чтобы не перекрывать кнопку подписки
        if (userMenuBlock) {
            userMenuBlock.style.cursor = 'pointer';
            userMenuBlock.addEventListener('click', (e: Event) => {
                if (subscribeButton && subscribeButton.contains(e.target as Node)) {
                    return; // Не нажимать на кнопку подписки
                }
                navigateToProfile(e);
            });
        }
    }

    private handleSubscribeAction(button: HTMLElement): void {
        // Получаем userId как строку
        const userId = button.getAttribute('data-user-id'); // ← Используем getAttribute
        
        console.log('🔍 [PostCard] handleSubscribeAction:', {
            userId: userId,
            buttonClass: button.className
        });
        
        if (!userId) return;
        
        const isSubscribed = button.classList.contains('user-menu__button--subscribed');
        
        if (isSubscribed) {
            dispatcher.dispatch('UNSUBSCRIBE_REQUEST', { 
                userId: userId, // ← Уже строка
                targetProfileId: userId
            });
        } else {
            dispatcher.dispatch('SUBSCRIBE_REQUEST', { 
                userId: userId, // ← Уже строка
                targetProfileId: userId
            });
        }
    }

    private async showLoginForm(targetUrl: string): Promise<void> {
        const loginView = new LoginFormView(targetUrl);
        const modal = await loginView.render();
        document.body.appendChild(modal);
    }
}