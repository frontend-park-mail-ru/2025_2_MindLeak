import { PopUpMenu } from '../PopUpMenu/PopUpMenu';
import { loginStore } from '../../stores/storeLogin';
import { dispatcher } from '../../dispatcher/dispatcher';
import { LoginFormView } from '../../views/viewLogin';
import { router } from '../../router/router';
import { CreatePostFormView } from '../../views/viewCreatePostForm';
import { SearchResults } from '../SearchResults/SearchResults';
import { searchStore } from '../../stores/storeSearch';

let headerTemplate: Handlebars.TemplateDelegate | null = null;
let isTemplateLoading: boolean = false;
let templateLoadPromise: Promise<Handlebars.TemplateDelegate> | null = null;

interface User {
    name: string;
    avatar: string;
    subtitle?: string;
}

async function getHeaderTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (headerTemplate) return headerTemplate;
    
    if (templateLoadPromise) return templateLoadPromise;
    
    isTemplateLoading = true;
    templateLoadPromise = (async (): Promise<Handlebars.TemplateDelegate> => {
        try {
            const [inputRes, buttonRes, iconRes, headerRes] = await Promise.all([
                fetch('/components/Input/Input.hbs'),
                fetch('/components/FormButton/FormButton.hbs'),
                fetch('/components/Icon/Icon.hbs'),
                fetch('/components/Header/Header.hbs')
            ]);

            if (!Handlebars.partials['input']) {
                const inputSource = await inputRes.text();
                Handlebars.registerPartial('input', Handlebars.compile(inputSource));
            }
            
            if (!Handlebars.partials['button']) {
                const buttonSource = await buttonRes.text();
                Handlebars.registerPartial('button', Handlebars.compile(buttonSource));
            }
            
            if (!Handlebars.partials['icon']) {
                const iconSource = await iconRes.text();
                Handlebars.registerPartial('icon', Handlebars.compile(iconSource));
            }

            const source = await headerRes.text();
            headerTemplate = Handlebars.compile(source);
            return headerTemplate;
            
        } catch (error) {
            templateLoadPromise = null;
            isTemplateLoading = false;
            throw error;
        }
    })();

    return templateLoadPromise;
}

export class Header {
    private static instance: Header | null = null;
    private headerElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private boundForceRefreshHandler: () => Promise<void>;
    private container: HTMLElement | null = null;
    private searchResults: SearchResults | null = null;
    private searchInput: HTMLInputElement | null = null;
    private searchTimeout: number | null = null;
    private lastShownQuery: string = '';
    private lastAvatarUrl: string = '';
    private lastIsLoggedIn: boolean = false;
    private isInitialized: boolean = false;

    // Обработчики событий как стрелочные функции
    private handleUserMenuClick = async (e: Event): Promise<void> => {
        e.stopPropagation();

        const target = e.currentTarget as HTMLElement;
        if (!target || !document.body.contains(target)) {
            console.error('❌ Target is null or not in DOM');
            return;
        }

        try {
            // ✅ ВАЖНО: Получаем СВЕЖИЕ данные при каждом клике
            const currentAuthState = loginStore.getState();
            if (!currentAuthState.isLoggedIn) {
                const currentPath = window.location.pathname + window.location.search;
                await this.showLoginForm(currentPath);
                return;
            }

            const existingMenu = document.querySelector('.popUp-menu');
            if (existingMenu && existingMenu.parentNode) {
                existingMenu.remove();
                return; 
            }

            const popUpMenu = new PopUpMenu({
                user: {
                    name: currentAuthState.user?.name || 'Пользователь',
                    avatar: currentAuthState.user?.avatar || '/img/defaultAvatar.jpg',
                    subtitle: currentAuthState.user?.subtitle || '',
                    email: currentAuthState.user?.email || ''
                },
                menuItems: [
                    { key: 'bookmarks', icon: '/img/icons/note_icon.svg', text: 'Черновики' },
                    { key: 'saved', icon: '/img/icons/bookmark.svg', text: 'Закладки' },
                    { key: 'settings', icon: '/img/icons/settings_icon.svg', text: 'Настройки' },
                    { key: 'subscription', icon: '/img/icons/premium_icon.svg', text: 'Подписка' },
                    { key: 'TechSupport', icon: '/img/icons/chat_icon.svg', text: 'Техподдержка' },
                    { key: 'Statistics', icon: '/img/icons/statistics_icon.svg', text: 'Статистика' },
                    { key: 'logout', icon: '/img/icons/exit_icon.svg', text: 'Выйти' }
                ]
            });

            const menuEl = await popUpMenu.render();
            const rect = target.getBoundingClientRect();
            
            // Проверяем что элемент еще в DOM
            if (!document.body.contains(target)) {
                console.error('❌ Target removed from DOM during async operation');
                return;
            }
            
            menuEl.style.position = 'fixed';
            menuEl.style.top = `${rect.bottom + 10}px`;
            menuEl.style.right = `${window.innerWidth - rect.right}px`;
            menuEl.style.zIndex = '1000';

            document.body.appendChild(menuEl);

            const closeMenu = (event: Event) => {
                const clickTarget = event.target as Node;
                if (!menuEl.contains(clickTarget) && clickTarget !== target) {
                    menuEl.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };

            document.addEventListener('click', closeMenu);
            
        } catch (error) {
            console.error('❌ Error in handleUserMenuClick:', error);
        }
    };

    private handleSearchInput = (e: Event): void => {
        const target = e.target as HTMLInputElement;
        const query = target.value.trim();
        
        console.log('🔍 Search input:', query);

        this.lastShownQuery = '';
        
        if (query.length === 0) {
            this.clearSearchResults();
            dispatcher.dispatch('SEARCH_CLEAR');
            return;
        }

        console.log('🚀 Immediate SEARCH_BLOGS_REQUEST for:', query);
        
        this.clearSearchResults();
        dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
    };

    private handleSearchFocus = (): void => {
        const query = this.searchInput?.value.trim();
        if (query && query.length >= 1) {
            const state = searchStore.getState();
            if (state.query === query && state.blogs.length > 0 && this.lastShownQuery !== query) {
                this.showSearchResults(state.blogs, state.query);
            }
        }
    };

    private handleClickOutside = (e: Event): void => {
        const target = e.target as Node;
        
        if (this.searchInput && !this.searchInput.contains(target)) {
            if (this.searchResults && this.searchResults.contains(target)) {
                return;
            }
            this.clearSearchResults();
        }
    };

    // ✅ Singleton pattern
    static getInstance(): Header {
        if (!Header.instance) {
            Header.instance = new Header();
        }
        return Header.instance;
    }

    static cleanup(): void {
        if (Header.instance) {
            Header.instance.destroy();
            Header.instance = null;
        }
    }

    private constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundForceRefreshHandler = this.forceRefresh.bind(this);
    }

    async init(container?: HTMLElement): Promise<void> {
        if (this.isInitialized) {
            console.log('🔄 Header already initialized, skipping');
            return;
        }

        console.log('🔄 Initializing Header...');
        
        if (container) {
            this.container = container;
        } else {
            // Если контейнер не передан, ищем или создаем header в body
            this.container = document.querySelector('header') as HTMLElement;
            if (!this.container) {
                this.container = document.createElement('header');
                document.body.insertBefore(this.container, document.body.firstChild);
            }
        }

        loginStore.addListener(this.boundStoreHandler);
        searchStore.addListener(this.boundStoreHandler);
        
        const authState = loginStore.getState();
        this.lastAvatarUrl = authState.user?.avatar || '';
        this.lastIsLoggedIn = authState.isLoggedIn;
        
        dispatcher.register('HEADER_FORCE_REFRESH', this.boundForceRefreshHandler);
        
        // Рендерим header при инициализации
        await this.render();
        
        this.isInitialized = true;
        console.log('✅ Header initialized successfully');
    }

    async render(): Promise<HTMLElement> {
        if (!this.container) {
            throw new Error('Header container not set. Call init() first.');
        }

        const template = await getHeaderTemplate();
        const authState = loginStore.getState();

        const html = template({
            isLoggedIn: authState.isLoggedIn,
            user: authState.user ? {
                name: authState.user.name,
                avatar: authState.user.avatar ? 
                    `${authState.user.avatar.split('?')[0]}?t=${Date.now()}` :
                    authState.user.avatar,
                subtitle: authState.user.subtitle || '',
                email: authState.user.email || ''
            } : null
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        // Удаляем старый header если он есть
        if (this.headerElement && this.headerElement.parentNode === this.container) {
            this.headerElement.remove();
        }
        
        this.headerElement = div.firstElementChild as HTMLElement;
        
        if (!this.headerElement) {
            throw new Error('Header element not found');
        }

        this.container.appendChild(this.headerElement);
        this.setupEventHandlers();
        
        return this.headerElement;
    }

    getElement(): HTMLElement | null {
        return this.headerElement;
    }

    private async showLoginForm(targetUrl?: string): Promise<void> {
        const loginView = new LoginFormView(targetUrl);
        const modal = await loginView.render();
        document.body.appendChild(modal);
    }

    private setupEventHandlers(): void {
        if (!this.headerElement) return;

        console.log('🔄 Setting up header event handlers');

        const authState = loginStore.getState();

        const logo = this.headerElement.querySelector('[data-key="logo"]') as HTMLElement;
        if (logo) {
            logo.addEventListener('click', (e: Event) => {
                e.preventDefault();
                this.navigateToHome();
            });
        }

        const userMenu = this.headerElement.querySelector('.user_info_header') as HTMLElement;
        if (userMenu) {
            // Удаляем старый обработчик если есть
            userMenu.removeEventListener('click', this.handleUserMenuClick);
            // Добавляем новый обработчик
            userMenu.addEventListener('click', this.handleUserMenuClick);
        }

        const createPostButton = this.headerElement.querySelector('button[data-key="createPost"]') as HTMLButtonElement;
        if (createPostButton) {
            if (authState.isLoggedIn) { 
                createPostButton.addEventListener('click', async (e: Event) => {
                    e.preventDefault();
                    const createPostForm = new CreatePostFormView();
                    const formElement = await createPostForm.render();
                    document.body.appendChild(formElement);
                });
            } else {
                createPostButton.addEventListener('click', async (e: Event) => {
                    e.preventDefault();
                    await this.showLoginForm();
                });
            }
        }

        const loginButton = this.headerElement.querySelector('button[data-key="login"]') as HTMLButtonElement;
        if (loginButton && !authState.isLoggedIn) {
            loginButton.addEventListener('click', async (e: Event) => {
                e.preventDefault();
                await this.showLoginForm();
            });
        }

        this.searchInput = this.headerElement.querySelector('.header__search') as HTMLInputElement;
        if (this.searchInput) {
            console.log('✅ Search input found, adding event listeners');
            this.setupSearchHandlers();
        } else {
            console.error('❌ Search input not found!');
        }

        document.addEventListener('click', this.handleClickOutside);
    }

    private navigateToHome(): void {
        router.navigate('/');
    }

    private async showSearchResults(users: any[], query: string): Promise<void> {
        this.clearSearchResults();

        console.log('🔍 Showing search results with users:', users, 'query:', query);

        if (users.length > 0 || query.length > 0) {
            this.searchResults = new SearchResults({
                users: users,
                query: query,
                onShowAllResults: () => {
                    console.log('🔍 Navigate to search page with query:', query);
                    router.navigate(`/search?q=${encodeURIComponent(query)}`);
                }
            });

            const resultsElement = await this.searchResults.render();
            
            if (this.searchInput) {
                const rect = this.searchInput.getBoundingClientRect();
                
                resultsElement.classList.add('search-results--positioned');
                resultsElement.style.top = `${rect.bottom + window.scrollY}px`;
                resultsElement.style.left = `${rect.left + window.scrollX}px`;
                resultsElement.style.width = `${rect.width}px`;
            }

            document.body.appendChild(resultsElement);
            this.lastShownQuery = query;
        }
    }

    private clearSearchResults(): void {
        const existingResults = document.querySelectorAll('.search-results');
        existingResults.forEach(result => {
            result.remove();
        });
        
        if (this.searchResults) {
            this.searchResults.destroy();
            this.searchResults = null;
        }
    }

    private resetSearchState(): void {
        this.lastShownQuery = '';
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.clearSearchResults();
    }

    private async handleStoreChange(): Promise<void> {
        const authState = loginStore.getState();
        const searchState = searchStore.getState();
        
        // ПРОСТАЯ проверка обновления Header
        const shouldUpdate = 
            this.lastIsLoggedIn !== authState.isLoggedIn ||
            this.lastAvatarUrl !== authState.user?.avatar;
        
        if (shouldUpdate) {
            console.log('🔄 Header needs update:', {
                loginChanged: this.lastIsLoggedIn !== authState.isLoggedIn,
                avatarChanged: this.lastAvatarUrl !== authState.user?.avatar
            });
            
            this.lastAvatarUrl = authState.user?.avatar || '';
            this.lastIsLoggedIn = authState.isLoggedIn;
            
            await this.refreshHeader();
        }
        
        // Обработка поиска
        const currentInputValue = this.searchInput?.value.trim() || '';
        
        if (searchState.query !== currentInputValue) {
            return;
        }
        
        if (currentInputValue.length === 0) {
            this.clearSearchResults();
            this.lastShownQuery = '';
            return;
        }
        
        if (this.lastShownQuery === currentInputValue) {
            return;
        }
        
        if (searchState.isLoading) {
            // Загрузка...
        } else if (searchState.error) {
            this.clearSearchResults();
        } else {
            await this.showSearchResults(searchState.blogs, searchState.query);
        }
    }

    private async refreshHeader(): Promise<void> {
        if (!this.container) {
            console.error('❌ Cannot refresh header: container not set');
            return;
        }
        
        console.log('🔄 Refreshing header...');
        
        const currentSearchValue = this.searchInput?.value || '';
        const hadFocus = document.activeElement === this.searchInput;
        
        const newHeader = await this.render();
        
        if (this.headerElement && this.headerElement.parentNode === this.container) {
            this.headerElement.parentNode.replaceChild(newHeader, this.headerElement);
        } else {
            this.container.appendChild(newHeader);
        }
        
        this.headerElement = newHeader;
        
        this.searchInput = this.headerElement.querySelector('.header__search') as HTMLInputElement;
        if (this.searchInput && currentSearchValue) {
            this.searchInput.value = currentSearchValue;
            this.setupSearchHandlers();
            
            if (hadFocus) {
                this.searchInput.focus();
            }
        }
        
        console.log('✅ Header refreshed');
    }

    private setupSearchHandlers(): void {
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.handleSearchInput);
            this.searchInput.removeEventListener('focus', this.handleSearchFocus);
            
            this.searchInput.addEventListener('input', this.handleSearchInput);
            this.searchInput.addEventListener('focus', this.handleSearchFocus);
        }
    }

    private async forceRefresh(): Promise<void> {
        console.log('🔧 Force refreshing header...');
        await this.refreshHeader();
    }

    destroy(): void {
        console.log('🧹 Destroying Header...');
        
        loginStore.removeListener(this.boundStoreHandler);
        searchStore.removeListener(this.boundStoreHandler);
        
        if (this.boundForceRefreshHandler) {
            dispatcher.unregister('HEADER_FORCE_REFRESH', this.boundForceRefreshHandler);
        }
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.clearSearchResults();
        document.removeEventListener('click', this.handleClickOutside);

        if (this.headerElement && this.headerElement.parentNode === this.container) {
            this.headerElement.remove();
            this.headerElement = null;
        }
        
        this.container = null;
        this.isInitialized = false;
        
        console.log('✅ Header destroyed');
    }
}