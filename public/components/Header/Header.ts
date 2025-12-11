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
                user: authState.user ? {
                    // Явно передаем все поля
                    name: authState.user.name,
                    avatar: authState.user.avatar ? 
                        `${authState.user.avatar}?t=${Date.now()}` :
                        authState.user.avatar,
                    subtitle: authState.user.subtitle || '',
                    email: authState.user.email || ''
                } : null
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
                    user: {
                        name: loginStore.getState().user?.name || 'Пользователь',
                        avatar: loginStore.getState().user?.avatar || '/img/defaultAvatar.jpg',
                        subtitle: loginStore.getState().user?.subtitle || '',
                        email: loginStore.getState().user?.email || ''
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

        // Сбрасываем последний показанный запрос
        this.lastShownQuery = '';
        
        // Очищаем результаты при пустом запросе
        if (query.length === 0) {
            this.clearSearchResults();
            dispatcher.dispatch('SEARCH_CLEAR');
            return;
        }

        // НЕМЕДЛЕННО отправляем запрос (без таймаута)
        console.log('🚀 Immediate SEARCH_BLOGS_REQUEST for:', query);
        
        // Очищаем предыдущие результаты
        this.clearSearchResults();
        
        // Отправляем запрос
        dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
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
                
                // Добавляем позиционирующий класс
                resultsElement.classList.add('search-results--positioned');
                
                // Устанавливаем стили позиционирования
                resultsElement.style.top = `${rect.bottom + window.scrollY}px`;
                resultsElement.style.left = `${rect.left + window.scrollX}px`;
                resultsElement.style.width = `${rect.width}px`;
            }

            document.body.appendChild(resultsElement);
            this.lastShownQuery = query;
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

    private resetSearchState(): void {
        this.lastShownQuery = '';
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        this.clearSearchResults();
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

    private async handleStoreChange(): Promise<void> {
        const currentLoginState = loginStore.getState();
        
        // ДОБАВЬТЕ ЭТУ ПРОВЕРКУ ДЛЯ АВАТАРА
        if (this.lastLoginState && this.lastLoginState.user?.avatar !== currentLoginState.user?.avatar) {
            console.log('🖼️ Avatar changed, updating header!');
            console.log('Old avatar:', this.lastLoginState.user?.avatar);
            console.log('New avatar:', currentLoginState.user?.avatar);
            
            // Принудительно обновляем header
            this.lastLoginState = { ...currentLoginState };
            
            const currentSearchValue = this.searchInput?.value || '';
            const hadFocus = document.activeElement === this.searchInput;
            
            const newHeader = await this.render();
            if (this.container && newHeader.parentNode !== this.container) {
                this.container.appendChild(newHeader);
            }
            
            // Восстанавливаем состояние поиска
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
            
            return;
        }

        const searchState = searchStore.getState();
        const currentInputValue = this.searchInput?.value.trim() || '';
        
        console.log('🔍 Header: Store changed -', {
            storeQuery: searchState.query,
            inputQuery: currentInputValue,
            lastShown: this.lastShownQuery,
            usersCount: searchState.blogs.length,
            isLoading: searchState.isLoading
        });
        
        // Проверяем что результаты в store соответствуют ТЕКУЩЕМУ значению инпута
        
        // Если запросы не совпадают - игнорируем эти результаты
        // Это защита от "устаревших" (stale) результатов
        if (searchState.query !== currentInputValue) {
            console.log('🔄 Ignoring stale results - query mismatch:', {
                storeQuery: searchState.query,
                currentInput: currentInputValue
            });
            
            // Если в store пустой запрос, но у нас есть ввод - тоже игнорируем
            if (searchState.query === '' && currentInputValue.length > 0) {
                console.log('🔄 Store is empty but input has value - waiting for proper response');
                return;
            }
            
            // Если store ещё загружается для другого запроса - ждём
            if (searchState.isLoading && searchState.query !== currentInputValue) {
                console.log('🔄 Store is loading different query - waiting');
                return;
            }
            
            return;
        }
        
        // Теперь мы знаем, что запросы совпадают
        // Показываем результаты ТОЛЬКО если:
        // 1. Запросы совпадают (уже проверили)
        // 2. Запрос не пустой
        // 3. Это не тот же запрос, что уже показан
        // 4. Store не в состоянии загрузки (или мы хотим показать loading state)
        
        if (currentInputValue.length === 0) {
            // Пустой запрос - очищаем результаты
            this.clearSearchResults();
            this.lastShownQuery = '';
            return;
        }
        
        // Проверяем, не показывали ли мы уже результаты для этого запроса
        if (this.lastShownQuery === currentInputValue) {
            console.log('🔄 Already shown results for this query:', currentInputValue);
            return;
        }
        
        // Если всё ок, показываем результаты
        console.log('✅ Showing results for current query:', currentInputValue);
        
        if (searchState.isLoading) {
            // Можно показать индикатор загрузки
            console.log('⏳ Results are still loading...');
            // Здесь можно добавить показ loading state если нужно
        } else if (searchState.error) {
            // Показываем ошибку если есть
            console.error('❌ Search error:', searchState.error);
            this.clearSearchResults();
        } else {
            // Показываем результаты
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