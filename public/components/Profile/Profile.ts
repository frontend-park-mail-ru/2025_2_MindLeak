let profileTemplate: Handlebars.TemplateDelegate | null = null;

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

async function getProfileTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (profileTemplate) return profileTemplate;

    const postCardRes = await fetch('/components/PostCard/PostCard.hbs');
    if (postCardRes.ok) {
        const postCardSource = await postCardRes.text();
        Handlebars.registerPartial('post-card', Handlebars.compile(postCardSource));
    }

    const inputRes = await fetch('/components/Input/Input.hbs');
    if (inputRes.ok) {
        const inputSource = await inputRes.text();
        Handlebars.registerPartial('input', Handlebars.compile(inputSource));
    }

    Handlebars.registerHelper('eq', (a, b) => a === b);

    const res = await fetch('/components/Profile/Profile.hbs');
    const source = await res.text();
    profileTemplate = Handlebars.compile(source);
    return profileTemplate;
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