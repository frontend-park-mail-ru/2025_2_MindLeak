let profileTemplate: Handlebars.TemplateDelegate | null = null;

interface ProfileProps {
    profile: any;
    posts: any[];
    activeTab: 'posts' | 'comments';
    isLoading: boolean;
    error: string | null;
}

async function getProfileTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (profileTemplate) return profileTemplate;

    const postCardRes = await fetch('/components/PostCard/PostCard.hbs');
    if (postCardRes.ok) {
        const postCardSource = await postCardRes.text();
        Handlebars.registerPartial('post-card', Handlebars.compile(postCardSource));
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
        const template = await getProfileTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const profileElement = div.firstElementChild as HTMLElement;
        
        if (!profileElement) {
            throw new Error('Profile element not found');
        }

        return profileElement;
    }
}