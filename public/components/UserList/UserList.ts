let userListTemplate: Handlebars.TemplateDelegate | null = null;

interface User {
    id: string;
    name: string;
    subtitle: string;
    avatar: string;
    isSubscribed?: boolean;
    hideSubscribeButton?: boolean;
}

interface UserListProps {
    title: string;
    users?: User[];
}

async function getUserListTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (userListTemplate) return userListTemplate;
    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));
    const res = await fetch('/components/UserList/UserList.hbs');
    const source = await res.text();
    userListTemplate = Handlebars.compile(source);
    return userListTemplate;
}

export class UserList {
    private props: UserListProps;

    constructor(props: UserListProps) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getUserListTemplate();
        const displayedUsers = this.props.users?.slice(0, 7) || [];
        const html = template({
            title: this.props.title,
            users: displayedUsers
        });
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const userListElement = div.firstElementChild as HTMLElement;
        if (!userListElement) {
            throw new Error('User list element not found');
        }
      
        // Добавляем обработчики кликов для пользователей
        this.attachUserClickHandlers(userListElement);
        
        return userListElement;
    }

private attachUserClickHandlers(container: HTMLElement): void {
        const userItems = container.querySelectorAll('.user-list__item');
        
        userItems.forEach((userItem, index) => {
            const user = this.props.users?.[index];
            if (user && user.id) {
                const userItemElement = userItem as HTMLElement;
                
                userItemElement.style.cursor = 'pointer';
                
                userItemElement.addEventListener('click', (e) => {
                    // Предотвращаем переход если кликнули на кнопку подписки
                    const target = e.target as HTMLElement;
                    if (target.closest('.user-menu__button') || 
                        target.classList.contains('user-menu__button')) {
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Переход в профиль пользователя
                    console.log('Переход в профиль пользователя:', user.id);
                    window.history.pushState({}, '', `/profile?id=${user.id}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                });
            }
        });
    }
}