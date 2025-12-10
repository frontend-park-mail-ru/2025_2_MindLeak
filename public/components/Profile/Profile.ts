import { PostCardMenu } from '../PostCardMenu/PostCardMenu';
import { dispatcher } from '../../dispatcher/dispatcher';

let profileTemplate: Handlebars.TemplateDelegate | null = null;
let partialsLoaded = false;

async function loadAllPartials(): Promise<void> {
    if (partialsLoaded) return;

    const partials = [
        { name: 'post-card', path: '/components/PostCard/PostCard.hbs' },
        { name: 'input', path: '/components/Input/Input.hbs' },
        { name: 'user-menu', path: '/components/UserMenu/UserMenu.hbs' },
        { name: 'tag', path: '/components/Tag/Tag.hbs' },
        { name: 'icon', path: '/components/Icon/Icon.hbs' },
        { name: 'menu-item', path: '/components/MenuItem/MenuItem.hbs' },
        { name: 'post-card-menu', path: '/components/PostCardMenu/PostCardMenu.hbs' }
    ];

    const loadPromises = partials.map(async (partial) => {
        if (Handlebars.partials[partial.name]) {
            return;
        }
        
        try {
            const response = await fetch(partial.path);
            if (response.ok) {
                const source = await response.text();
                Handlebars.registerPartial(partial.name, Handlebars.compile(source));
            }
        } catch (error) {
            // Игнорируем ошибки загрузки партиалов
        }
    });

    await Promise.all(loadPromises);
    partialsLoaded = true;
}

async function getProfileTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (profileTemplate) return profileTemplate;

    await loadAllPartials();

    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('concat', function(...args: any[]) {
        args.pop();
        return args.join('');
    });

    const res = await fetch('/components/Profile/Profile.hbs');
    const source = await res.text();
    profileTemplate = Handlebars.compile(source);
    return profileTemplate;
}

interface ProfileProps {
    profile: any;
    posts: any[];
    comments: any[];
    activeTab: 'posts' | 'comments';
    isLoading: boolean;
    error: string | null;
    isEditingDescription?: boolean;
    isMyProfile?: boolean;
}

function transformPostForProfile(apiPost: any, isMyProfile: boolean): any {
    if (!apiPost) return {};
    
    // СОЗДАЕМ menuItems ТАК ЖЕ КАК В POSTCARD.TS
    let menuItems = [
        { key: 'hide', text: 'Скрыть' },
        { key: 'report', text: 'Пожаловаться' }
    ];
            
    if (isMyProfile) {
        menuItems = [
            { key: 'edit', text: 'Редактировать' },
            { key: 'delete', text: 'Удалить' },
            ...menuItems
        ];
    }
    
    return {
        postId: apiPost.id || '',
        authorId: apiPost.authorId,
        user: {
            name: apiPost.authorName || 'Аноним',
            subtitle: apiPost.theme || 'Блог', 
            avatar: apiPost.authorAvatar || '/img/defaultAvatar.jpg',
            isSubscribed: false,
            id: apiPost.authorId
        },
        title: apiPost.title || '',
        text: apiPost.content || '',
        image: apiPost.image || '',
        tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
        commentsCount: apiPost.commentsCount || 0,
        repostsCount: apiPost.repostsCount || 0,
        viewsCount: apiPost.viewsCount || 0,
        isOwnPost: isMyProfile,
        canEdit: isMyProfile,
        dataPostId: apiPost.id || '',
        menuItems: menuItems
    };
}

function transformCommentForProfile(apiComment: any): any {
    return {
        commentId: apiComment.id,
        text: apiComment.content,
        postId: apiComment.article_id,
        user: {
            name: apiComment.author_name || 'Аноним',
            avatar: apiComment.author_avatar || '/img/defaultAvatar.jpg',
            id: apiComment.user_id
        },
        articleTitle: apiComment.article_title,
        createdAt: apiComment.created_at
    };
}

export class Profile {
    private props: ProfileProps;

    constructor(props: ProfileProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const transformedPosts = this.props.posts.map(post => 
            transformPostForProfile(post, this.props.isMyProfile || false)
        );
        const transformedComments = this.props.comments?.map(transformCommentForProfile) || [];


        const templateData = {
            ...this.props,
            posts: transformedPosts,
            comments: transformedComments
        };

        const template = await getProfileTemplate();
        const html = template(templateData);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const profileElement = div.firstElementChild as HTMLElement;
        
        if (!profileElement) {
            throw new Error('Profile element not found');
        }

        this.initializePostCardMenus(profileElement);
        this.setupCommentIconClickHandlers(profileElement);

        return profileElement;
    }

    private initializePostCardMenus(container: HTMLElement): void {
        const postCards = container.querySelectorAll('.post-card');
        
        postCards.forEach((postCard, index) => {
            const menuButton = postCard.querySelector('.post-card__menu-button') as HTMLElement;
            const menuPopup = postCard.querySelector('.post-card-menu') as HTMLElement;
            
            if (menuButton && menuPopup) {
                const postId = this.extractPostId(postCard);
                
                if (postId) {
                    try {
                        new PostCardMenu(menuButton, menuPopup, postId, (key: string, postId: string) => {
                            this.handlePostAction(key, postId);
                        });
                    } catch (error) {
                        // Игнорируем ошибки инициализации меню
                    }
                }
            }
        });
    }

    private setupCommentIconClickHandlers(container: HTMLElement): void {
        const commentIcons = container.querySelectorAll('.tag[data-key="comments"]');
        
        commentIcons.forEach(icon => {
            icon.addEventListener('click', (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                const postCardWithId = icon.closest('[data-post-id]');
                
                if (postCardWithId) {
                    const postId = postCardWithId.getAttribute('data-post-id');
                    if (postId) {
                        import('../../router/router').then(module => {
                            module.router.navigate(`/post/${postId}`);
                        });
                    }
                } else {
                    console.error('No element with data-post-id found');
                    console.log('Icon element:', icon);
                    console.log('Closest .post-card:', icon.closest('.post-card'));
                }
            });
        });
    }

    private extractPostId(postCard: Element): string | null {
        if (postCard.hasAttribute('data-post-id')) {
            return postCard.getAttribute('data-post-id');
        }
        
        const postIdElement = postCard.querySelector('[data-post-id]');
        if (postIdElement) {
            return postIdElement.getAttribute('data-post-id');
        }
        
        const id = postCard.id;
        if (id && id.startsWith('post-')) {
            return id.replace('post-', '');
        }
        
        const titleElement = postCard.querySelector('.post-card__title');
        if (titleElement && titleElement.id) {
            return titleElement.id.replace('post-', '');
        }
        
        const innerPostCard = postCard.querySelector('.post-card');
        if (innerPostCard && innerPostCard.hasAttribute('data-post-id')) {
            return innerPostCard.getAttribute('data-post-id');
        }
        
        return null;
    }

    private handlePostAction(action: string, postId: string): void {
        // ТОЛЬКО действия, которые не обрабатываются внутри PostCardMenu
        switch (action) {
            case 'edit':
                dispatcher.dispatch('POST_EDIT_REQUEST', { postId });
                break;
            case 'hide':
                dispatcher.dispatch('POST_HIDE_REQUEST', { postId });
                break;
            case 'report':
                dispatcher.dispatch('POST_REPORT_REQUEST', { postId });
                break;
            // 'delete' обрабатывается полностью внутри PostCardMenu
        }
    }
}