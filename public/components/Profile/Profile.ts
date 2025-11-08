import { PostCardMenu } from '../PostCardMenu/PostCardMenu';
import { dispatcher } from '../../dispatcher/dispatcher';
import { router } from '../../router/router';
import { CreatePostFormView } from '../../views/viewCreatePostForm';
import { loginStore } from '../../stores/storeLogin';
import { DeletePostModal } from '../DeletePostModal/DeletePostModal';

let profileTemplate: Handlebars.TemplateDelegate | null = null;

// Глобальный флаг для отслеживания загруженных partials
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

    // Загружаем все partials, которые еще не загружены
    const loadPromises = partials.map(async (partial) => {
        // Если partial уже загружен, пропускаем
        if (Handlebars.partials[partial.name]) {
            return;
        }
        
        try {
            const response = await fetch(partial.path);
            if (response.ok) {
                const source = await response.text();
                Handlebars.registerPartial(partial.name, Handlebars.compile(source));
                console.log(`${partial.name} partial loaded`);
            } else {
                console.warn(`Failed to load ${partial.name} partial`);
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

    // ЗАГРУЖАЕМ ВСЕ PARTIALS ПЕРЕД КОМПИЛЯЦИЕЙ
    await loadAllPartials();

    // Регистрируем хелперы
    Handlebars.registerHelper('eq', (a, b) => a === b);

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

// Функция для преобразования поста в формат PostCard
function transformPostForProfile(apiPost: any, isMyProfile: boolean = false): any {
    if (!apiPost) return {};
    
    console.log('🔍 [Profile] Преобразование поста для профиля:', apiPost);
    
    return {
        postId: apiPost.id, // Теперь передаем реальный ID поста
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
        image: apiPost.image || '', // Изображение из media_url
        tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
        commentsCount: apiPost.commentsCount || 0,
        repostsCount: apiPost.repostsCount || 0,
        viewsCount: apiPost.viewsCount || 0,
        isOwnPost: isMyProfile, // В профиле посты принадлежат владельцу профиля
        canEdit: isMyProfile, // Можно редактировать только свои посты
        // Дополнительные поля для совместимости
        createdAt: apiPost.createdAt,
        updatedAt: apiPost.updatedAt,
        isLiked: apiPost.isLiked || false,
        isBookmarked: apiPost.isBookmarked || false
    };
}

export class Profile {
    private props: ProfileProps;
    private postCardMenus: PostCardMenu[] = [];

    constructor(props: ProfileProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        // Преобразуем посты в правильный формат для отображения
        const transformedPosts = this.props.posts.map(post => 
            transformPostForProfile(post, this.props.isMyProfile)
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

        // Инициализируем меню для постов
        this.initializePostCardMenus(profileElement);

        return profileElement;
    }

    private initializePostCardMenus(container: HTMLElement): void {
        // Очищаем предыдущие меню
        this.postCardMenus = [];

        const postCards = container.querySelectorAll('.post-card');
        
        postCards.forEach((postCard) => {
            const menuButton = postCard.querySelector('.post-card__menu-button') as HTMLElement;
            const menuPopup = postCard.querySelector('.post-card-menu') as HTMLElement;
            const postId = postCard.getAttribute('data-post-id');

            if (menuButton && menuPopup && postId) {
                console.log(`[Profile] Инициализация меню для поста: ${postId}`);
                
                // Определяем, какие пункты меню должны быть доступны
                const isOwnPost = this.props.isMyProfile;
                
                // Создаем меню с колбэком для обработки действий
                const postCardMenu = new PostCardMenu(menuButton, menuPopup, postId, (key: string, postId: string) => {
                    this.handleMenuAction(key, postId, isOwnPost);
                });
                
                this.postCardMenus.push(postCardMenu);
                
                // Динамически скрываем/показываем пункты меню
                this.setupMenuItemsVisibility(menuPopup, isOwnPost);
            }
        });
    }

    private setupMenuItemsVisibility(menuPopup: HTMLElement, isOwnPost: boolean): void {
        const menuItems = menuPopup.querySelectorAll('[data-key]');
        
        menuItems.forEach(item => {
            const key = item.getAttribute('data-key');
            
            // Скрываем пункты редактирования и удаления для чужих постов
            if ((key === 'edit' || key === 'delete') && !isOwnPost) {
                (item as HTMLElement).style.display = 'none';
            }
            
            // Показываем пункты редактирования и удаления для своих постов
            if ((key === 'edit' || key === 'delete') && isOwnPost) {
                (item as HTMLElement).style.display = 'block';
            }
        });
    }

    private handleMenuAction(key: string, postId: string, isOwnPost: boolean): void {
        console.log(`[Profile] Menu action: ${key} for post: ${postId}, isOwnPost: ${isOwnPost}`);
        
        // Проверяем права доступа для определенных действий
        if ((key === 'edit' || key === 'delete') && !isOwnPost) {
            console.warn(`[Profile] Попытка выполнить действие ${key} для чужого поста`);
            return;
        }
        
        switch (key) {
            case 'edit':
                this.handleEditPost(postId);
                break;
            case 'delete':
                this.handleDeletePost(postId);
                break;
            case 'hide':
                this.handleHidePost(postId);
                break;
            case 'report':
                this.handleReportPost(postId);
                break;
            default:
                console.warn(`Unknown menu action: ${key}`);
        }
    }

    private async handleEditPost(postId: string): Promise<void> {
        console.log(`[Profile] Editing post: ${postId}`);
        
        // Отправляем запрос на загрузку данных поста для редактирования
        dispatcher.dispatch('POST_EDIT_REQUEST', { postId });
        
        // Открываем форму редактирования
        const createPostForm = new CreatePostFormView();
        const formElement = await createPostForm.render();
        document.body.appendChild(formElement);
    }

    private async handleDeletePost(postId: string): Promise<void> {
        console.log(`[Profile] Deleting post: ${postId}`);
        
        // Создаем и показываем модалку подтверждения
        const deleteModal = new DeletePostModal();
        const modalElement = await deleteModal.render();
        document.body.appendChild(modalElement);

        // Ждем результата от пользователя
        const confirmed = await deleteModal.waitForResult();
        
        if (confirmed) {
            console.log(`[Profile] Пользователь подтвердил удаление поста: ${postId}`);
            // Отправляем запрос на удаление поста
            dispatcher.dispatch('POST_DELETE_REQUEST', { postId });
        } else {
            console.log(`[Profile] Пользователь отменил удаление поста: ${postId}`);
        }
    }

    private handleHidePost(postId: string): void {
        console.log(`[Profile] Hiding post: ${postId}`);
        // Реализация скрытия поста
        // Можно добавить dispatch действия для скрытия
    }

    private handleReportPost(postId: string): void {
        console.log(`[Profile] Reporting post: ${postId}`);
        // Реализация жалобы на пост
        // Можно добавить dispatch действия для жалобы
    }

    // Метод для очистки меню при уничтожении компонента
    destroy(): void {
        this.postCardMenus.forEach(menu => {
            // Если в PostCardMenu есть метод destroy, вызываем его
            if ((menu as any).destroy) {
                (menu as any).destroy();
            }
        });
        this.postCardMenus = [];
    }
}