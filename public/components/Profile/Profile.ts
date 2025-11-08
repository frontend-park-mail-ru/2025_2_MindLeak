import { PostCardMenu } from '../PostCardMenu/PostCardMenu';
import { DeletePostModal } from '../DeletePostModal/DeletePostModal';
import { dispatcher } from '../../dispatcher/dispatcher';

let profileTemplate: Handlebars.TemplateDelegate | null = null;
let partialsLoaded = false;

async function loadAllPartials(): Promise<void> {
    if (partialsLoaded) return;

    console.log(' Loading all partials for Profile...');
    
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
            console.log(`${partial.name} partial already loaded`);
            return;
        }
        
        try {
            const response = await fetch(partial.path);
            if (response.ok) {
                const source = await response.text();
                Handlebars.registerPartial(partial.name, Handlebars.compile(source));
                console.log(`${partial.name} partial loaded successfully`);
            } else {
                console.warn(`Failed to load ${partial.name} partial: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error loading ${partial.name} partial:`, error);
        }
    });

    await Promise.all(loadPromises);
    partialsLoaded = true;
    console.log('All partials loaded for Profile');
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
    activeTab: 'posts' | 'comments';
    isLoading: boolean;
    error: string | null;
    isEditingDescription?: boolean;
    isMyProfile?: boolean;
}

function transformPostForProfile(apiPost: any, isMyProfile: boolean): any {
    if (!apiPost) return {};
    
    console.log('🔍 [Profile] Transforming post data:', {
        apiPostId: apiPost.id,
        apiPost: apiPost
    });
    
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
        menuItems: menuItems // ДОБАВЛЯЕМ menuItems!
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
        
        const templateData = {
            ...this.props,
            posts: transformedPosts
        };

        const template = await getProfileTemplate();
        const html = template(templateData);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const profileElement = div.firstElementChild as HTMLElement;
        
        if (!profileElement) {
            throw new Error('Profile element not found');
        }

        // ИНИЦИАЛИЗИРУЕМ PostCardMenu ДЛЯ КАЖДОГО ПОСТА
        this.initializePostCardMenus(profileElement);

        return profileElement;
    }

    private initializePostCardMenus(container: HTMLElement): void {
        const postCards = container.querySelectorAll('.post-card');
        console.log(`[Profile] Found ${postCards.length} post cards for menu initialization`);
        
        postCards.forEach((postCard, index) => {
            const menuButton = postCard.querySelector('.post-card__menu-button') as HTMLElement;
            const menuPopup = postCard.querySelector('.post-card-menu') as HTMLElement;
            
            console.log(`[Profile] Post card ${index}:`, { 
                hasMenuButton: !!menuButton, 
                hasMenuPopup: !!menuPopup 
            });
            
            if (menuButton && menuPopup) {
                const postId = this.extractPostId(postCard);
                console.log(`[Profile] Initializing PostCardMenu for post: ${postId}`);
                
                if (postId) {
                    try {
                        new PostCardMenu(menuButton, menuPopup, postId, (key: string, postId: string) => {
                            this.handlePostAction(key, postId);
                        });
                        console.log(`[Profile] PostCardMenu initialized successfully for post: ${postId}`);
                    } catch (error) {
                        console.error(`[Profile] Failed to initialize PostCardMenu for post ${postId}:`, error);
                    }
                }
            }
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
        
        console.warn('[Profile] Could not extract post ID from element:', postCard);
        return null;
    }

    private handlePostAction(action: string, postId: string): void {
        console.log(`[Profile] Post action: ${action} for post: ${postId}`);
        
        switch (action) {
            case 'edit':
                dispatcher.dispatch('POST_EDIT_REQUEST', { postId });
                break;
            case 'delete':
                // Удаление обрабатывается внутри PostCardMenu
                this.handleDeletePost(postId);
                break;
            case 'hide':
                dispatcher.dispatch('POST_HIDE_REQUEST', { postId });
                break;
            case 'report':
                dispatcher.dispatch('POST_REPORT_REQUEST', { postId });
                break;
        }
    }
    
    private async handleDeletePost(postId: string): Promise<void> {
        console.log(`[Profile] Deleting post: ${postId}`);
        
        // Динамически импортируем DeletePostModal
        const { DeletePostModal } = await import('../DeletePostModal/DeletePostModal');
        
        // Показываем модалку подтверждения удаления
        const deleteModal = new DeletePostModal();
        const modalElement = await deleteModal.render();
        document.body.appendChild(modalElement);

        const confirmed = await deleteModal.waitForResult();
        
        if (confirmed) {
            console.log(`[Profile] User confirmed deletion, dispatching POST_DELETE_REQUEST`);
            dispatcher.dispatch('POST_DELETE_REQUEST', { postId });
            
            // После удаления запускаем перезагрузку профиля
            setTimeout(() => {
                console.log(`[Profile] Reloading profile after delete`);
                dispatcher.dispatch('PROFILE_RELOAD_AFTER_DELETE');
            }, 500); // Небольшая задержка чтобы API успел обработать удаление
        }
    }
}