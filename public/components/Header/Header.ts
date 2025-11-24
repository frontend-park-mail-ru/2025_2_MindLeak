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
    private headerElement: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private container: HTMLElement | null = null;
    private searchResults: SearchResults | null = null;
    private searchInput: HTMLInputElement | null = null;
    private searchTimeout: number | null = null;
    private lastShownQuery: string = '';
    private isRendering: boolean = false; // ДОБАВИТЬ: флаг для предотвращения ререндера
    private lastLoginState: any = null; // ДОБАВИТЬ: кэш состояния логина

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.init();
    }

    private init(): void {
        loginStore.addListener(this.boundStoreHandler);
        searchStore.addListener(this.boundStoreHandler);
        this.lastLoginState = loginStore.getState(); // ИНИЦИАЛИЗИРУЕМ
        dispatcher.dispatch('LOGIN_CHECK_REQUEST');
    }

    async render(container?: HTMLElement): Promise<HTMLElement> {
        // ЗАЩИТА ОТ РЕКУРСИВНОГО РЕНДЕРА
        if (this.isRendering) {
            return this.headerElement!;
        }
        
        this.isRendering = true;
        
        try {
            if (container) {
                this.container = container;
            }

            const template = await getHeaderTemplate();
            const authState = loginStore.getState();

            // ПРОВЕРЯЕМ, ДЕЙСТВИТЕЛЬНО ЛИ ИЗМЕНИЛОСЬ СОСТОЯНИЕ
            if (this.headerElement && 
                this.lastLoginState && 
                this.lastLoginState.isLoggedIn === authState.isLoggedIn &&
                this.lastLoginState.user?.id === authState.user?.id) {
                // Состояние не изменилось - возвращаем существующий элемент
                return this.headerElement;
            }

            // ОБНОВЛЯЕМ КЭШ
            this.lastLoginState = { ...authState };

            const html = template({
                isLoggedIn: authState.isLoggedIn,
                user: authState.user
            });

            const div = document.createElement('div');
            div.innerHTML = html.trim();
            
            // УДАЛЯЕМ СТАРЫЙ HEADER ТОЛЬКО ЕСЛИ ОН СУЩЕСТВУЕТ
            if (this.headerElement && this.headerElement.parentNode) {
                this.headerElement.remove();
            }
            
            this.headerElement = div.firstElementChild as HTMLElement;
            
            if (!this.headerElement) {
                throw new Error('Header element not found');
            }

            this.setupEventHandlers();
            return this.headerElement;
        } finally {
            this.isRendering = false;
        }
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
                userMenu.addEventListener('click', async (e: Event) => {
                e.stopPropagation();

                if (!authState.isLoggedIn) {
                    const currentPath = window.location.pathname + window.location.search;
                    await this.showLoginForm(currentPath);
                    return;
                }

                const existingMenu = document.querySelector('.popUp-menu');
                if (existingMenu) {
                    existingMenu.remove();
                    return; 
                }

                const popUpMenu = new PopUpMenu({
                    user: authState.user!,
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
                const rect = userMenu.getBoundingClientRect();
                menuEl.style.position = 'fixed';
                menuEl.style.top = `${rect.bottom + 10}px`;
                menuEl.style.right = `${window.innerWidth - rect.right}px`;
                menuEl.style.zIndex = '1000';

                document.body.appendChild(menuEl);

                const closeMenu = (event: Event) => {
                    const target = event.target as Node;
                    if (!menuEl.contains(target) && target !== userMenu) {
                        menuEl.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                };

                document.addEventListener('click', closeMenu);
            });
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

        // Обработка поиска
        this.searchInput = this.headerElement.querySelector('.header__search') as HTMLInputElement;
        if (this.searchInput) {
            console.log('✅ Search input found, adding event listeners');
            this.setupSearchHandlers();
        } else {
            console.error('❌ Search input not found!');
        }

        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    private navigateToHome(): void {
        router.navigate('/');
    }

    private handleSearchInput(e: Event): void {
        const target = e.target as HTMLInputElement;
        const query = target.value.trim();
        
        console.log('🔍 Search input:', query);

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }

        // ОЧИЩАЕМ РЕЗУЛЬТАТЫ ПРИ ЛЮБОМ ИЗМЕНЕНИИ
        this.clearSearchResults();

        if (query.length >= 1) { 
            // Используем таймаут для дебаунса
            this.searchTimeout = window.setTimeout(() => {
                console.log('🚀 Dispatching SEARCH_BLOGS_REQUEST');
                dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
            }, 300);
        } else {
            dispatcher.dispatch('SEARCH_CLEAR');
        }
    }

    private handleSearchFocus(): void {
        const query = this.searchInput?.value.trim();
        if (query && query.length >= 1) {
            const state = searchStore.getState();
            // ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ ТОЛЬКО ЕСЛИ ЗАПРОС СОВПАДАЕТ И ЕСТЬ РЕЗУЛЬТАТЫ
            if (state.query === query && state.blogs.length > 0 && this.lastShownQuery !== query) {
                this.showSearchResults(state.blogs, state.query);
            }
        }
    }

    private async showSearchResults(users: any[], query: string): Promise<void> {
        // ВСЕГДА ОЧИЩАЕМ ПРЕДЫДУЩИЕ РЕЗУЛЬТАТЫ
        this.clearSearchResults();

        console.log('🔍 Showing search results with users:', users, 'query:', query);

        // СОЗДАЕМ РЕЗУЛЬТАТЫ ТОЛЬКО ЕСЛИ ЕСТЬ ПОЛЬЗОВАТЕЛИ ИЛИ ЗАПРОС НЕ ПУСТОЙ
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
                resultsElement.style.position = 'absolute';
                resultsElement.style.top = `${rect.bottom + window.scrollY}px`;
                resultsElement.style.left = `${rect.left + window.scrollX}px`;
                resultsElement.style.width = `${rect.width}px`;
                resultsElement.style.zIndex = '1000';
                resultsElement.style.background = 'white';
                resultsElement.style.border = '1px solid #ccc';
                resultsElement.style.borderRadius = '4px';
                resultsElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }

            document.body.appendChild(resultsElement);
            this.lastShownQuery = query; // ЗАПОМИНАЕМ ПОСЛЕДНИЙ ПОКАЗАННЫЙ ЗАПРОС
        }
    }

    private clearSearchResults(): void {
        // УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ РЕЗУЛЬТАТЫ ИЗ DOM
        const existingResults = document.querySelectorAll('.search-results');
        existingResults.forEach(result => {
            result.remove();
        });
        
        // ОЧИЩАЕМ ССЫЛКУ
        if (this.searchResults) {
            this.searchResults.destroy();
            this.searchResults = null;
        }
    }

    private handleClickOutside(e: Event): void {
        const target = e.target as Node;
        
        if (this.searchInput && !this.searchInput.contains(target)) {
            if (this.searchResults && this.searchResults.contains(target)) {
                return;
            }
            this.clearSearchResults();
        }
    }

    private async handleStoreChange(): Promise<void>  {
        const searchState = searchStore.getState();
        console.log('🔍 Header: Search store changed:', searchState);
        
        const currentInputValue = this.searchInput?.value.trim() || '';
        
        // ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ ТОЛЬКО ЕСЛИ:
        // 1. Запрос в store совпадает с текущим значением инпута
        // 2. Есть результаты ИЛИ запрос не пустой
        // 3. Это НЕ тот же запрос, который уже показан
        if (searchState.query === currentInputValue && 
            currentInputValue.length >= 1 &&
            this.lastShownQuery !== currentInputValue) {
            
            console.log('🔄 Store updated, showing search results');
            await this.showSearchResults(searchState.blogs, searchState.query);
        }
        
        // ОБНОВЛЯЕМ HEADER ТОЛЬКО ЕСЛИ ДЕЙСТВИТЕЛЬНО ИЗМЕНИЛОСЬ СОСТОЯНИЕ ЛОГИНА
        const loginState = loginStore.getState();
        const shouldUpdateHeader = this.container && 
                                this.lastLoginState && 
                                (this.lastLoginState.isLoggedIn !== loginState.isLoggedIn ||
                                 this.lastLoginState.user?.id !== loginState.user?.id);
        
        if (shouldUpdateHeader) {
            console.log('🔄 Header: Login state changed, updating header');
            const currentSearchValue = this.searchInput?.value || '';
            const hadFocus = document.activeElement === this.searchInput;
            
            const newHeader = await this.render();
            if (this.container && newHeader.parentNode !== this.container) {
                this.container.appendChild(newHeader);
            }
            
            // ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ПОИСКА
            const newSearchInput = newHeader.querySelector('.header__search') as HTMLInputElement;
            if (newSearchInput && currentSearchValue) {
                newSearchInput.value = currentSearchValue;
                this.searchInput = newSearchInput;
                this.setupSearchHandlers();
                
                if (hadFocus) {
                    this.searchInput.focus();
                    this.searchInput.setSelectionRange(
                        currentSearchValue.length, 
                        currentSearchValue.length
                    );
                }
            }
        }
    }

    private setupSearchHandlers(): void {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
        }
    }

    destroy(): void {
        loginStore.removeListener(this.boundStoreHandler);
        searchStore.removeListener(this.boundStoreHandler);
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.clearSearchResults();

        document.removeEventListener('click', this.handleClickOutside);

        // УДАЛЯЕМ HEADER ИЗ DOM
        if (this.headerElement && this.headerElement.parentNode) {
            this.headerElement.parentNode.removeChild(this.headerElement);
            this.headerElement = null;
        }
        
        // ОЧИЩАЕМ КОНТЕЙНЕР
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
        
        // СБРАСЫВАЕМ СОСТОЯНИЕ
        this.lastLoginState = null;
        this.isRendering = false;
    }
}