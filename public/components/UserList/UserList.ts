import { CacheChecker } from '../../utils/cacheChecker';
import { OfflineWarning } from '../OfflineWarning/OfflineWarning';

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
        await this.attachUserClickHandlers(userListElement);
        
        return userListElement;
    }

    private async attachUserClickHandlers(container: HTMLElement): Promise<void> {
        const userItems = container.querySelectorAll('.user-list__item');
        
        for (const [index, userItem] of userItems.entries()) {
            const user = this.props.users?.[index];
            if (user && user.id) {
                const userItemElement = userItem as HTMLElement;
                
                userItemElement.style.cursor = 'pointer';
                
                userItemElement.addEventListener('click', async (e) => {
                    // Предотвращаем переход если кликнули на кнопку подписки
                    const target = e.target as HTMLElement;
                    if (target.closest('.user-menu__button') || 
                        target.classList.contains('user-menu__button')) {
                        return;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();

                    // Проверяем оффлайн режим
                    if (!navigator.onLine) {
                        const isCached = await CacheChecker.isProfileCached(user.id);
                        
                        if (!isCached) {
                            // Показываем модальное окно с ошибкой
                            await this.showOfflineProfileWarning(user.name, user.id);
                            return;
                        }
                    }
                    
                    // Переход в профиль пользователя
                    console.log('Переход в профиль пользователя:', user.id);
                    window.history.pushState({}, '', `/profile?id=${user.id}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                });
            }
        }
    }

    private async showOfflineProfileWarning(userName: string, userId: string): Promise<void> {
        const overlay = document.createElement('div');
        overlay.className = 'offline-modal-overlay';
        
        const offlineWarning = new OfflineWarning({
            title: 'Профиль недоступен оффлайн',
            message: `Профиль "${userName}" не был сохранён для просмотра без интернета.`,
            requestedId: userId,
            onBack: () => overlay.remove()
        });
        
        const warningElement = await offlineWarning.render();
        warningElement.classList.add('offline-modal-content');
        
        overlay.appendChild(warningElement);
        document.body.appendChild(overlay);
        
        // Закрытие при клике на фон
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }
}