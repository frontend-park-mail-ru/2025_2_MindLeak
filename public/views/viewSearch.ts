import { UserList } from '../components/UserList/UserList';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { searchStore } from '../stores/storeSearch';
import { dispatcher } from '../dispatcher/dispatcher';
import { userListStore } from '../stores/storeUserList';
import { Header } from '../components/Header/Header';

export class SearchView {
    private postsView: PostsView | null = null;
    private contentWrapper: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private boundUserListHandler: () => void;
    private userListElement: HTMLElement | null = null;
    private isUserListRendered: boolean = false;
    private rootElement: HTMLElement | null = null;
    private hasInitializedSearch: boolean = false;
    private currentQuery: string = '';
    private headerInstance: Header;
    private isHandlingStoreUpdate: boolean = false;
    private isDestroyed: boolean = false;

    // Статическое поле для хранения единственного экземпляра Header
    private static headerInstance: Header | null = null;

    constructor() {
        this.postsView = new PostsView();
        
        // Используем синглтон для Header - создаем только один экземпляр
        if (!SearchView.headerInstance) {
            SearchView.headerInstance = new Header();
            console.log('🔍 SearchView: Created new Header instance');
        } else {
            console.log('🔍 SearchView: Reusing existing Header instance');
        }
        this.headerInstance = SearchView.headerInstance;
        
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundUserListHandler = this.handleUserListChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        
        // Создаем корневой элемент
        this.rootElement = document.createElement('div');
        
        // Header - добавляем как в других view
        const headerContainer = document.createElement('header');
        
        // ПРОВЕРЯЕМ, НЕ УНИЧТОЖЕН ЛИ VIEW
        if (this.isDestroyed) {
            return this.rootElement;
        }
        
        console.log('🔍 SearchView: Rendering Header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        this.rootElement.appendChild(headerContainer);
        
        // Основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        this.rootElement.appendChild(contentContainer);

        // Левое меню (категории)
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        // Верхнее меню категорий
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            '', // Никакая категория не активна в поиске
            (key) => {
                let newUrl = '';
                if (key === 'fresh') {
                    newUrl = '/feed';
                } else {
                    newUrl = `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                }
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        const sidebarEl1 = await sidebar1.render();

        // Нижнее меню категорий
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '', // Никакая категория не активна в поиске
            (key) => {
                let newUrl = '';
                if (key === 'fresh') {
                    newUrl = '/feed';
                } else {
                    newUrl = `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                }
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        const sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // Центральная часть
        const pageElement = document.createElement('main');
        pageElement.className = 'main-content';
        
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'search-page';
        pageElement.appendChild(this.contentWrapper);

        // Правое меню (топ блогов)
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(pageElement);
        contentContainer.appendChild(rightMenu);

        // Загружаем топ блогов для правого меню
        if (!this.isUserListRendered) {
            dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
            this.isUserListRendered = true;
        }

        // Загружаем результаты поиска
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q') || '';
        this.currentQuery = query;
        
        if (query && !this.hasInitializedSearch) {
            // ВСЕГДА делаем свежий поиск при первом рендере
            console.log('🔍 SearchView: Making fresh search for query:', query);
            dispatcher.dispatch('SEARCH_CLEAR');
            dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
            dispatcher.dispatch('SEARCH_POSTS_REQUEST', { query });
            
            this.hasInitializedSearch = true;
            
            // Показываем состояние загрузки сразу
            this.showLoading(query);
        } else if (!query) {
            this.showEmptySearch();
        }

        // ПРОВЕРЯЕМ, НЕ УНИЧТОЖЕН ЛИ VIEW ПЕРЕД ПОДПИСКОЙ
        if (!this.isDestroyed) {
            // Подписываемся на stores ПОСЛЕ инициализации поиска
            setTimeout(() => {
                if (!this.isDestroyed) {
                    searchStore.addListener(this.boundStoreHandler);
                    userListStore.addListener(this.boundUserListHandler);
                }
            }, 0);
        }

        return this.rootElement;
    }

    private handleStoreChange(): void {
        // ЗАЩИТА ОТ ВЫЗОВОВ ПОСЛЕ УНИЧТОЖЕНИЯ
        if (this.isDestroyed || this.isHandlingStoreUpdate) {
            return;
        }
        
        this.isHandlingStoreUpdate = true;
        
        try {
            const state = searchStore.getState();
            
            console.log('🔍 SearchView: Store changed - query:', state.query, 'current:', this.currentQuery);
            
            // Обновляем ТОЛЬКО если запрос совпадает с текущим
            if (state.query === this.currentQuery) {
                console.log('🔍 SearchView: Updating results for query:', state.query);
                this.updateSearchResults(state);
            }
        } finally {
            this.isHandlingStoreUpdate = false;
        }
    }

    private handleUserListChange(): void {
        if (this.isDestroyed) return;
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        if (this.isDestroyed) return;
        
        const rightMenu = this.rootElement?.querySelector('.sidebar-right');
        
        if (!rightMenu) return;

        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }

        const state = userListStore.getState();
        if (state.users && state.users.length > 0) {
            const newList = new UserList({
                title: 'Топ блогов',
                users: state.users
            });
            
            this.userListElement = await newList.render();
            rightMenu.appendChild(this.userListElement);
        }
    }

    private async updateSearchResults(state: any): Promise<void> {
        if (this.isDestroyed || !this.contentWrapper) return;

        console.log('🔍 SearchView: Updating results with state:', state);

        // Если загружается, показываем индикатор загрузки
        if (state.isLoading) {
            this.showLoading(state.query);
            return;
        }

        // Обновляем только контент
        this.contentWrapper.innerHTML = '';

        // Заголовок поиска
        const titleEl = document.createElement('h1');
        titleEl.className = 'search-page__title';
        titleEl.textContent = `Результаты поиска: "${state.query}"`;
        this.contentWrapper.appendChild(titleEl);

        let hasResults = false;

        // Секция авторов
        console.log('👥 Authors found:', state.blogs.length, state.blogs);
        if (state.blogs.length > 0) {
            hasResults = true;
            const authorsSection = document.createElement('section');
            authorsSection.className = 'search-page__section';
            
            const authorsTitle = document.createElement('h2');
            authorsTitle.className = 'search-page__section-title';
            authorsTitle.textContent = 'Авторы';
            authorsSection.appendChild(authorsTitle);

            const userList = new UserList({
                title: '',
                users: state.blogs
            });
            
            const userListEl = await userList.render();
            authorsSection.appendChild(userListEl);
            this.contentWrapper.appendChild(authorsSection);
        }

        // Секция постов
        console.log('📝 Posts found:', state.posts.length, state.posts);
        if (state.posts.length > 0) {
            hasResults = true;
            const postsSection = document.createElement('section');
            postsSection.className = 'search-page__section';
            
            const postsTitle = document.createElement('h2');
            postsTitle.className = 'search-page__section-title';
            postsTitle.textContent = 'Посты';
            postsSection.appendChild(postsTitle);

            if (this.postsView) {
                const postsContainer = document.createElement('div');
                postsContainer.className = 'search-posts-container';
                postsSection.appendChild(postsContainer);
                
                await this.postsView.initWithPosts(postsContainer, state.posts);
            }
            
            this.contentWrapper.appendChild(postsSection);
        }

        // Сообщение если ничего не найдено
        console.log('📊 Total results:', hasResults, 'Loading:', state.isLoading);
        if (!hasResults && !state.isLoading) {
            console.log('❌ Showing no results message');
            this.showNoResults(state.query);
        }
    }

    private showLoading(query: string): void {
        if (this.isDestroyed || !this.contentWrapper) return;

        this.contentWrapper.innerHTML = `
            <div class="search-loading-state">
                <h1 class="search-loading-state__title">Поиск: "${query}"</h1>
                <p class="search-loading-state__text">Ищем авторов и посты...</p>
            </div>
        `;
    }

    private showEmptySearch(): void {
        if (this.isDestroyed || !this.contentWrapper) return;

        this.contentWrapper.innerHTML = `
            <div class="search-empty-state">
                <h1 class="search-empty-state__title">Поиск</h1>
                <p class="search-empty-state__text">Введите запрос в поисковой строке чтобы найти авторов и посты</p>
            </div>
        `;
    }

    private showNoResults(query: string): void {
        if (this.isDestroyed || !this.contentWrapper) return;

        const noResultsEl = document.createElement('div');
        noResultsEl.className = 'search-no-results';
        noResultsEl.innerHTML = `
            <div class="search-no-results__content">
                <h2 class="search-no-results__title">Ничего не найдено</h2>
                <p class="search-no-results__text">По запросу "${query}" не найдено ни авторов, ни постов</p>
                <p class="search-no-results__suggestion">Попробуйте изменить запрос или посмотрите популярные темы в категориях слева</p>
            </div>
        `;
        this.contentWrapper.appendChild(noResultsEl);
    }

    destroy(): void {
        console.log('🔍 SearchView destroy called');
        
        // УСТАНАВЛИВАЕМ ФЛАГ УНИЧТОЖЕНИЯ ПЕРВЫМ ДЕЛОМ
        this.isDestroyed = true;
        this.hasInitializedSearch = false;
        this.currentQuery = '';
        this.isHandlingStoreUpdate = false;
        
        // Отписываемся от stores
        searchStore.removeListener(this.boundStoreHandler);
        userListStore.removeListener(this.boundUserListHandler);
        
        // Уничтожаем компоненты
        if (this.postsView) {
            this.postsView.destroy();
            this.postsView = null;
        }
        
        // Очищаем user list
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }
        
        // Удаляем корневой элемент
        if (this.rootElement && this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
            this.rootElement = null;
        }
        
        // Сбрасываем флаги
        this.isUserListRendered = false;
        this.contentWrapper = null;
        
        console.log('🔍 SearchView destroyed completely');
    }

    // Статический метод для очистки синглтона (опционально)
    public static cleanup(): void {
        if (SearchView.headerInstance) {
            SearchView.headerInstance.destroy();
            SearchView.headerInstance = null;
            console.log('🔍 SearchView: Header singleton cleaned up');
        }
    }
}