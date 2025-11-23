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

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.init();
    }

    private init(): void {
        loginStore.addListener(this.boundStoreHandler);
        searchStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('LOGIN_CHECK_REQUEST');
    }

    async render(container?: HTMLElement): Promise<HTMLElement> {
        if (container) {
            this.container = container;
        }

        const template = await getHeaderTemplate();
        const authState = loginStore.getState();

        const html = template({
            isLoggedIn: authState.isLoggedIn,
            user: authState.user
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        
        if (this.headerElement && this.headerElement.parentNode) {
            this.headerElement.remove();
        }
        
        this.headerElement = div.firstElementChild as HTMLElement;
        
        if (!this.headerElement) {
            throw new Error('Header element not found');
        }

        this.setupEventHandlers();
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
        console.log('🔍 Header element:', this.headerElement);

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

                // ПРОВЕРКА АВТОРИЗАЦИИ ПРЯМО ЗДЕСЬ
                if (!authState.isLoggedIn) {
                    // Сохраняем текущий URL для редиректа после логина
                    const currentPath = window.location.pathname + window.location.search;
                    await this.showLoginForm(currentPath);
                    return;
                }

                // Если авторизован - показываем меню как раньше
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
                menuEl.style.position = 'fixed'; // ← вместо 'absolute'
                menuEl.style.top = `${rect.bottom + 10}px`; // ← учитываем скролл
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
            this.setupSearchHandlers(); // ИСПОЛЬЗУЕМ НОВЫЙ МЕТОД
        } else {
            console.error('❌ Search input not found!');
        }

        // Закрытие результатов при клике вне области
        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    private navigateToHome(): void {
        router.navigate('/');
    }

    private handleSearchInput(e: Event): void {
        const target = e.target as HTMLInputElement;
        const query = target.value.trim();
        
        console.log('🔍 Search input:', query); // Добавьте эту строку

        // Очищаем предыдущий таймаут
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (query.length >= 2) {
            console.log('🚀 Dispatching SEARCH_BLOGS_REQUEST'); // Добавьте эту строку
            // Дебаунс запросов - отправляем через 300мс
            this.searchTimeout = window.setTimeout(() => {
                dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
            }, 300);
        } else {
            // Скрываем результаты если запрос слишком короткий
            if (this.searchResults) {
                this.searchResults.hide();
            }
            // Очищаем результаты в store если запрос пустой
            if (query.length === 0) {
                dispatcher.dispatch('SEARCH_CLEAR');
            }
        }
    }

    private handleSearchFocus(): void {
        const query = this.searchInput?.value.trim();
        if (query && query.length >= 2) {
            // Показываем предыдущие результаты при фокусе
            const state = searchStore.getState();
            if (state.blogs.length > 0) {
                this.showSearchResults(state.blogs, state.query);
            }
        }
    }

    private async showSearchResults(users: any[], query: string): Promise<void> {
        // Скрываем предыдущие результаты
        if (this.searchResults) {
            this.searchResults.destroy();
        }

        console.log('🔍 Showing search results with users:', users, 'query:', query);

        this.searchResults = new SearchResults({
            users: users,
            query: query,
            onShowAllResults: () => {
                console.log('🔍 Navigate to search page with query:', query);
                router.navigate(`/search?q=${encodeURIComponent(query)}`);
            }
        });

        const resultsElement = await this.searchResults.render();
        
        // Детальная проверка элементов после рендера
        const showAllButton = resultsElement.querySelector('[data-action="show-all"]');
        const footer = resultsElement.querySelector('.search-results__footer');
        const listItems = resultsElement.querySelectorAll('.search-result-item');
        
        console.log('🔍 After SearchResults render:');
        console.log('  - Show-all button:', !!showAllButton);
        console.log('  - Footer:', !!footer);
        console.log('  - List items count:', listItems.length);
        console.log('  - Results element HTML:', resultsElement.outerHTML);
        
        // Позиционируем под поиском
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
    }

    private handleClickOutside(e: Event): void {
        const target = e.target as Node;
        
        if (this.searchInput && !this.searchInput.contains(target)) {
            // Используем публичный метод contains вместо прямого доступа к element
            if (this.searchResults && this.searchResults.contains(target)) {
                return; // Клик внутри результатов поиска - не закрываем
            }
            // Клик вне области поиска и результатов - закрываем результаты
            this.searchResults?.hide();
        }
    }

    private async handleStoreChange(): Promise<void>  {
        const searchState = searchStore.getState();
        console.log('🔍 Header: Search store changed:', searchState)
        
        // СОХРАНЯЕМ ТЕКУЩЕЕ ЗНАЧЕНИЕ ПОИСКА
        const currentSearchValue = this.searchInput?.value || '';
        
        // ВСЕГДА ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ ПОИСКА С КНОПКОЙ "ПОКАЗАТЬ ВСЕ РЕЗУЛЬТАТЫ"
        if (this.searchInput?.value.trim() && searchState.query) {
            console.log('🔍 Showing search results:', searchState.blogs);
            await this.showSearchResults(searchState.blogs, searchState.query);
        }
        
        // ВОССТАНАВЛИВАЕМ ЗНАЧЕНИЕ ПОИСКА ПОСЛЕ ПЕРЕРИСОВКИ
        if (this.searchInput && this.searchInput.value !== currentSearchValue) {
            this.searchInput.value = currentSearchValue;
        }
        
        // Обновляем header только если изменился loginStore
        const loginState = loginStore.getState();
        if (this.container && this.headerElement && loginState !== loginStore.getState()) {
            const newHeader = await this.render();
            this.container.appendChild(newHeader);
            
            // ВОССТАНАВЛИВАЕМ ЗНАЧЕНИЕ ПОИСКА ПОСЛЕ ПЕРЕРИСОВКИ HEADER
            const newSearchInput = newHeader.querySelector('.header__search') as HTMLInputElement;
            if (newSearchInput && currentSearchValue) {
                newSearchInput.value = currentSearchValue;
                this.searchInput = newSearchInput;
                this.setupSearchHandlers();
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
        
        if (this.searchResults) {
            this.searchResults.destroy();
        }

        document.removeEventListener('click', this.handleClickOutside);

        if (this.headerElement && this.headerElement.parentNode) {
            this.headerElement.remove();
        }
    }
}