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
function transformPostForProfile(apiPost: any): any {
    if (!apiPost) return {};
    
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
        tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
        commentsCount: apiPost.commentsCount || 0,
        repostsCount: apiPost.repostsCount || 0,
        viewsCount: apiPost.viewsCount || 0,
        isOwnPost: true // В профиле всегда свои посты
    };
}

export class Profile {
    private props: ProfileProps;

    constructor(props: ProfileProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        // Преобразуем посты в правильный формат для отображения
        const transformedPosts = this.props.posts.map(post => transformPostForProfile(post));
        
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

        return profileElement;
    }
}
