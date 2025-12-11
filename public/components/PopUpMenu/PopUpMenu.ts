import { dispatcher } from '../../dispatcher/dispatcher';
import { loginStore } from '../../stores/storeLogin'

let popUpMenuTemplate: Handlebars.TemplateDelegate | null = null;
let currentTechSupportModal: HTMLElement | null = null;
let currentTechSupportIframe: HTMLIFrameElement | null = null;
let isIframeLoading: boolean = false;

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

function closeTechSupportModal(): void {
    if (currentTechSupportModal) {
        console.log('🧹 Closing tech support modal programmatically');
        
        // Отправляем команду очистки в iframe
        if (currentTechSupportIframe?.contentWindow) {
            console.log('🧹 Sending CLEANUP command to iframe');
            currentTechSupportIframe.contentWindow.postMessage({ 
                type: 'CLEANUP',
                source: 'main-window'
            }, '*');
        }
        
        currentTechSupportModal.remove();
        currentTechSupportModal = null;
        currentTechSupportIframe = null;
        isIframeLoading = false;
    }
}

function openTechSupportModal(): void {
    console.log('🛟 Opening tech support modal...');
    
    // Закрываем предыдущее модальное окно если есть
    if (currentTechSupportModal) {
        console.log('🧹 Closing previous tech support modal');
        closeTechSupportModal();
    }
    
    // Получаем данные пользователя из store
    const authState = loginStore.getState();
    const user = authState.user;
    
    // Получаем все необходимые данные из профиля
    const userEmail = user?.email || '';
    const userName = user?.name || '';
    const userContactEmail = user?.email || '';
    
    console.log('📧 User data from profile:', { 
        userEmail, 
        userName,
        userContactEmail
    });

    // Создаем модальное окно для iframe
    const modal = document.createElement('div');
    modal.className = 'iframe-modal';
    
    const iframe = document.createElement('iframe');
    iframe.src = window.location.origin + '/TechSupport.html';
    console.log('🔗 Iframe URL:', iframe.src);
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    
    modal.innerHTML = `<button class="iframe-modal__close">&times;</button>`;
    modal.appendChild(iframe);
    
    // Флаг чтобы предотвратить множественную отправку INIT_DATA
    let initDataSent = false;
    
    // Обработчик загрузки iframe
    const loadHandler = () => {
        console.log('📄 Iframe loaded');
        
        // Даем время iframe на инициализацию
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!initDataSent && iframe.contentWindow) {
                    console.log('📤 Sending INIT_DATA to iframe...');
                    
                    const message = {
                        type: 'INIT_DATA',
                        payload: {
                            userEmail: userEmail,
                            userName: userName,
                            userContactEmail: userContactEmail
                        },
                        source: 'main-window'
                    };
                    
                    initDataSent = true;
                    iframe.contentWindow.postMessage(message, window.location.origin);
                    console.log('✅ User data sent to iframe');
                }
            });
        });
    };
    
    iframe.addEventListener('load', loadHandler, { once: true });

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

    // Закрытие по ESC
    const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && currentTechSupportModal) {
            console.log('❌ Closing tech support modal (ESC)');
            closeTechSupportModal();
        }
    };
    document.addEventListener('keydown', handleEscKey);

    // Обработчик закрытия
    const closeButton = modal.querySelector('.iframe-modal__close') as HTMLButtonElement;
    closeButton.addEventListener('click', () => {
        console.log('❌ Closing tech support modal');
        closeTechSupportModal();
    });

    // Закрытие по клику вне iframe
    modal.addEventListener('click', (e: Event) => {
        if (e.target === modal) {
            console.log('❌ Closing tech support modal (outside click)');
            closeTechSupportModal();
        }
    });

    // Сохраняем ссылки
    currentTechSupportModal = modal;
    currentTechSupportIframe = iframe;
    isIframeLoading = true;

    document.body.appendChild(modal);
    console.log('✅ Tech support modal opened');
}

async function handleLogout(): Promise<void> {
    try {
        dispatcher.dispatch('LOGOUT_REQUEST');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

let activePopUpMenus: PopUpMenu[] = [];

export class PopUpMenu {
    private user: User;
    private menuItems: MenuItem[];
    private lastSupportTicketTime: number = 0;
    private lastAppealsLoadTime: number = 0;
    private supportTicketMinInterval: number = 1000;
    private appealsLoadMinInterval: number = 2000;
    private isAppealsLoading: boolean = false;
    private appealsLoadQueue: number = 0;
    private boundLoginStoreHandler: () => void;
    private messageHandlerBound: ((e: MessageEvent) => void) | null = null;
    private popUpMenuElement: HTMLElement | null = null; // Новое поле для хранения ссылки на DOM элемент

    constructor({ user, menuItems }: PopUpMenuProps) {
        console.log('🎯 PopUpMenu constructor called');
        // AAAAAAAAAAAAAAAAAAaa
        popUpMenuTemplate = null;

        // Подписываемся на изменения loginStore
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        loginStore.addListener(this.boundLoginStoreHandler);
        
        // Получаем актуальные данные из store при каждом создании
        const authState = loginStore.getState();
        this.user = authState.user || user; // Используем актуальные данные из store
        
        console.log('👤 PopUpMenu user data:', this.user);

        activePopUpMenus.filter(menu => menu !== this).forEach(menu => {
            if (menu['destroy']) menu.destroy();
        });

        this.menuItems = menuItems || [
            { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
            { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
            { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
            { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
            { key: 'TechSupport', icon: '/img/icons/chat_icon.svg', text: 'Техподдержка' },
            { key: 'Statistics', icon: '/img/icons/statistics_icon.svg', text: 'Статистика' },
            { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
        ];
        
        this.setupMessageHandler();
        activePopUpMenus.push(this);
    }

    private handleLoginStoreChange(): void {
        const authState = loginStore.getState();
        // Проверяем изменилось ли имя или аватар, а не ID
        if (authState.user && this.user) {
            // Сравниваем только имя и аватар (не ID, т.к. его нет в интерфейсе User)
            if (this.user.name !== authState.user.name || 
                this.user.avatar !== authState.user.avatar ||
                this.user.subtitle !== authState.user.subtitle) {
                
                this.user = authState.user;
                console.log('🔄 PopUpMenu user data synced with store');
                
                // ОБНОВЛЯЕМ DOM если меню отображается
                this.forceUpdateDOM();
            }
        }
    }

    // Метод для принудительного обновления DOM
    public forceUpdateDOM(): void {
        if (!this.popUpMenuElement) return;
        
        const popUpMenu = this.popUpMenuElement;
        this.updateDOMUserData(popUpMenu);
        console.log('🔄 PopUpMenu DOM updated with new user data');
    }

    //основное изменение todo ФФФФФФФФФФФФФФФФФФФФФ
    private setupMessageHandler(): void {
        console.log('📡 Setting up message handler in PopUpMenu');
        if (this.messageHandlerBound) {
            window.removeEventListener('message', this.messageHandlerBound);
        }

        this.messageHandlerBound = this.handleIframeMessage.bind(this);
        window.addEventListener('message', this.messageHandlerBound);
    }

    public static clearTemplateCache(): void {
        popUpMenuTemplate = null;
        console.log('🧹 PopUpMenu template cache cleared');
    }

    private handleIframeMessage(event: MessageEvent): void {
        if (event.origin !== window.location.origin) {
            return;
        }
        
        const { type, payload, source } = event.data;
        
        if (source === 'tech-support') {
            switch (type) {
                case 'IFRAME_READY':
                    console.log('✅ Tech support iframe is ready');
                    break;
                    
                case 'SUPPORT_TICKET_SUBMIT_REQUEST':
                    console.log('🔄 Processing support ticket request');
                    this.handleSupportTicketRequest(payload);
                    break;
                    
                case 'APPEALS_LOAD_REQUEST':
                    console.log('🔄 Processing appeals load request');
                    this.handleAppealsLoadRequest();
                    break;
                    
                default:
                    console.log('❓ Unknown message type:', type);
            }
        }
    }

    private handleSupportTicketRequest(payload: any): void {
        const now = Date.now();
        if (now - this.lastSupportTicketTime > this.supportTicketMinInterval) {
            this.lastSupportTicketTime = now;
            console.log('📤 Dispatching support ticket');
            dispatcher.dispatch('SUPPORT_TICKET_SUBMIT_REQUEST', payload);
        } else {
            console.log('🚫 Support ticket throttled');
        }
    }

    private handleAppealsLoadRequest(): void {
        const now = Date.now();
        
        // Считаем количество запросов в очереди
        this.appealsLoadQueue++;
        
        // Если уже загружаем, ждем завершения
        if (this.isAppealsLoading) {
            console.log('⏳ Appeals already loading, request queued:', this.appealsLoadQueue);
            return;
        }
        
        // Проверяем интервал
        if (now - this.lastAppealsLoadTime > this.appealsLoadMinInterval) {
            this.lastAppealsLoadTime = now;
            this.isAppealsLoading = true;
            this.appealsLoadQueue = 0;
            
            console.log('📤 Dispatching appeals load');
            dispatcher.dispatch('APPEALS_LOAD_REQUEST');
        } else {
            console.log('🚫 Appeals load throttled');
            this.appealsLoadQueue = 0;
        }
    }

    // Метод для сброса флага загрузки (вызывается извне когда загрузка завершена)
    public markAppealsLoadComplete(): void {
        this.isAppealsLoading = false;
        console.log('✅ Appeals load marked as complete');
        
        // Если есть запросы в очереди, обрабатываем следующий
        if (this.appealsLoadQueue > 0) {
            console.log('🔄 Processing queued appeals load request');
            requestAnimationFrame(() => {
                this.handleAppealsLoadRequest();
            });
        }
    }

    public updateUserData(): void {
        const authState = loginStore.getState();
        if (authState.user) {
            this.user = authState.user;
            console.log('✅ PopUpMenu user data updated:', this.user);
            // Также обновляем DOM если меню отображается
            this.forceUpdateDOM();
        }
    }

    async render(): Promise<HTMLElement> {
        // Получаем актуальные данные перед рендером
        const currentAuthState = loginStore.getState();
        if (currentAuthState.user) {
            this.user = currentAuthState.user;
        }

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

        // Сохраняем ссылку на DOM элемент
        this.popUpMenuElement = popUpMenu;

        this.updateDOMUserData(popUpMenu);

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

        menuItems.forEach((item, index) => {
            const key = (item as HTMLElement).dataset.key;
            
            if (!item || !(item instanceof HTMLElement)) {
                return;
            }
            
            item.addEventListener('click', (e: Event) => {
                e.preventDefault();
                const clickedKey = (item as HTMLElement).dataset.key;

                if (popUpMenu.parentNode) {
                    popUpMenu.remove();
                }

                switch (clickedKey) {
                    case 'logout':
                        handleLogout();
                        break;
                    case 'settings':
                        window.history.pushState({}, '', '/settings');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'profile':
                        window.history.pushState({}, '', '/profile');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'Statistics':
                        window.history.pushState({}, '', '/appeals/statistics');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        break;
                    case 'TechSupport':
                        openTechSupportModal();
                        break;
                }
            });
        });

        popUpMenu.addEventListener('click', (e: Event) => {
            e.stopPropagation();
        });

        return popUpMenu;
    }

    private updateDOMUserData(popUpMenu: HTMLElement): void {
        // Обновляем данные пользователя в DOM
        const userNameEl = popUpMenu.querySelector('.user-menu__name');
        const userAvatarEl = popUpMenu.querySelector('.user-menu__avatar');
        const userSubtitleEl = popUpMenu.querySelector('.user-menu__subtitle');
        
        if (userNameEl) {
            userNameEl.textContent = this.user.name;
        }
        
        if (userAvatarEl && this.user.avatar) {
            // Важно: добавляем timestamp к URL чтобы избежать кэширования
            const avatarUrl = `${this.user.avatar}${this.user.avatar.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
            userAvatarEl.setAttribute('src', avatarUrl);
            console.log('🖼️ Updated avatar in PopUpMenu:', avatarUrl);
        }
        
        if (userSubtitleEl && this.user.subtitle) {
            userSubtitleEl.textContent = this.user.subtitle;
        }
    }

    destroy(): void {
        console.log('🗑️ Destroying PopUpMenu instance');
        
        // Отписываемся от loginStore
        if (this.boundLoginStoreHandler) {
            loginStore.removeListener(this.boundLoginStoreHandler);
        }
        
        if (this.messageHandlerBound) {
            window.removeEventListener('message', this.messageHandlerBound);
            this.messageHandlerBound = null;
        }
        
        const index = activePopUpMenus.indexOf(this);
        if (index > -1) {
            activePopUpMenus.splice(index, 1);
        }
        
        // Очищаем ссылку на DOM элемент
        this.popUpMenuElement = null;
    }
}

// FFFFFFFFFFFFFFF