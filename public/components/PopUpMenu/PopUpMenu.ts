import { dispatcher } from '../../dispatcher/dispatcher';
import { loginStore } from '../../stores/storeLogin'

let popUpMenuTemplate: Handlebars.TemplateDelegate | null = null;

interface MenuItem {
    key: string;
    icon: string;
    text: string;
}

interface User {
    name: string;
    avatar: string;
    subtitle?: string;
    email?: string;
}

interface PopUpMenuProps {
    user: User;
    menuItems?: MenuItem[];
}

async function getPopUpMenuTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (popUpMenuTemplate) return popUpMenuTemplate;

    const userMenuRes = await fetch('/components/UserMenu/UserMenu.hbs');
    const userMenuSource = await userMenuRes.text();
    Handlebars.registerPartial('user-menu', Handlebars.compile(userMenuSource));

    const menuItemRes = await fetch('/components/MenuItem/MenuItem.hbs');
    const menuItemSource = await menuItemRes.text();
    Handlebars.registerPartial('menu-item', Handlebars.compile(menuItemSource));

    const res = await fetch('/components/PopUpMenu/PopUpMenu.hbs');
    const source = await res.text();
    popUpMenuTemplate = Handlebars.compile(source);
    return popUpMenuTemplate;
}

function openTechSupportModal(): void {
    console.log('🛟 Opening tech support modal...');
    
    // Получаем данные пользователя из store
    const authState = loginStore.getState();
    const userEmail = authState.user?.email || '';
    
    console.log('📧 User email:', userEmail);

    // Создаем модальное окно для iframe
    const modal = document.createElement('div');
    modal.className = 'iframe-modal';
    
    const iframe = document.createElement('iframe');
    iframe.src = window.location.origin + '/TechSupport.html';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    
    modal.innerHTML = `<button class="iframe-modal__close">&times;</button>`;
    modal.appendChild(iframe);
    
    // Ждем загрузки iframe и отправляем данные
    iframe.addEventListener('load', () => {
        console.log('📄 Iframe loaded, sending user data...');
        // Даем iframe время на инициализацию
        setTimeout(() => {
            iframe.contentWindow?.postMessage({
                type: 'INIT_DATA',
                payload: {
                    userEmail: userEmail
                }
            }, '*');
            console.log('✅ Data sent to iframe');
        }, 500);
    });

    // Стили для модального окна (если их еще нет)
    if (!document.querySelector('style[data-tech-support]')) {
        const styles = document.createElement('style');
        styles.setAttribute('data-tech-support', 'true');
        styles.textContent = `
            .iframe-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .iframe-modal iframe {
                width: 90%;
                max-width: 540px;
                height: 80%;
                max-height: 700px;
                border: none;
                border-radius: 10px;
                background: var(--section-color);
            }
            .iframe-modal__close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                z-index: 10001;
            }
            .iframe-modal__close:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(styles);
    }

    // Обработчик закрытия
    const closeButton = modal.querySelector('.iframe-modal__close') as HTMLButtonElement;
    closeButton.addEventListener('click', () => {
        console.log('❌ Closing tech support modal');
        modal.remove();
    });

    // Закрытие по клику вне iframe
    modal.addEventListener('click', (e: Event) => {
        if (e.target === modal) {
            console.log('❌ Closing tech support modal (outside click)');
            modal.remove();
        }
    });

    // Закрытие по ESC
    const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            console.log('❌ Closing tech support modal (ESC)');
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    document.body.appendChild(modal);
    console.log('✅ Tech support modal opened');
}

async function handleLogout(): Promise<void> {
    try {
        dispatcher.dispatch('LOGOUT_REQUEST');
    } catch (err) {
    }
}

export class PopUpMenu {
    private user: User;
    private menuItems: MenuItem[];

    constructor({ user, menuItems }: PopUpMenuProps) {
        this.user = user;
        this.menuItems = menuItems || [
            { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
            { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
            { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
            { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
            { key: 'TechSupport', icon: '/img/icons/chat_icon.svg', text: 'Техподдержка' },
            { key: 'Statistics', icon: '/img/icons/chat_icon.svg', text: 'Статистика' },
            { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
        ];
    }

    async render(): Promise<HTMLElement> {
        const template = await getPopUpMenuTemplate();
        const html = template({
            user: this.user,
            menuItems: this.menuItems
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const popUpMenu = div.firstElementChild as HTMLElement;
        
        if (!popUpMenu) {
            throw new Error('Popup menu element not found');
        }

        const userMenuBlock = popUpMenu.querySelector('.user-menu') as HTMLElement;
        if (userMenuBlock) {
            userMenuBlock.style.cursor = 'pointer';
            userMenuBlock.addEventListener('click', (e: Event) => {
                e.preventDefault();
                
                if (popUpMenu.parentNode) {
                    popUpMenu.remove();
                }
                
                window.history.pushState({}, '', '/profile');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }

        const menuItems = popUpMenu.querySelectorAll('.menu-item');

        //ОТЛАДКА УДАЛИТЬ ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.
        console.log('🔍 Checking all menu items data-key:');
        menuItems.forEach((item, index) => {
            const key = (item as HTMLElement).dataset.key;
            const text = item.querySelector('.menu-item__text')?.textContent;
            console.log(`Item ${index}: data-key="${key}", text="${text}"`);
        });

        //ОТЛАДКА УДАЛИТЬ ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.
        menuItems.forEach((item, index) => {
            const key = (item as HTMLElement).dataset.key;
            console.log(`🎯 Setting up handler for menu item ${index}:`, key, item);
            
            // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ ДО ОБРАБОТЧИКА
            if (!item || !(item instanceof HTMLElement)) {
                console.error('❌ Invalid menu item:', item);
                return;
            }
            
            item.addEventListener('click', (e: Event) => {
                console.log('🖱️ CLICK EVENT FIRED for key:', key);
                console.log('🖱️ Event target:', e.target);
                console.log('🖱️ Current target:', e.currentTarget);
                
                e.preventDefault();
                const clickedKey = (item as HTMLElement).dataset.key;
                
                console.log('🖱️ Menu item clicked, key from dataset:', clickedKey);

                if (popUpMenu.parentNode) {
                    popUpMenu.remove();
                }

                console.log('🖱️ Processing action for key:', clickedKey);
                
                switch (clickedKey) {
                    case 'logout':
                        console.log('🚪 Logout clicked - executing');
                        handleLogout();
                        break;
                    case 'settings':
                        console.log('⚙️ Settings clicked - executing');
                        window.history.pushState({}, '', '/settings');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'profile':
                        console.log('👤 Profile clicked - executing');
                        window.history.pushState({}, '', '/profile');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'Statistics':
                        console.log('📊 Statistics clicked - executing');
                        window.history.pushState({}, '', '/support/statistics');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'TechSupport':
                        console.log('🛟 TechSupport clicked - EXECUTING openTechSupportModal');
                        alert('TechSupport clicked!'); // ← УБЕДИТЕСЬ ЧТО ЭТО СРАБАТЫВАЕТ
                        openTechSupportModal();
                        break;
                    default:
                        console.log('❓ Unknown menu item:', clickedKey);
                }
            });
        });
        console.log('🔍 Final menu structure:');
        menuItems.forEach((item, index) => {
            const element = item as HTMLElement;
            console.log(`Menu item ${index}:`, {
                tagName: element.tagName,
                className: element.className,
                dataset: element.dataset,
                innerHTML: element.innerHTML
            });
        });
        //ОТЛАДКА УДАЛИТЬ ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,.

        popUpMenu.addEventListener('click', (e: Event) => {
            e.stopPropagation();
        });

        return popUpMenu;
    }
}