import { BaseView } from './viewBase';
import { PostsView } from './viewPosts';
import { UserList } from '../components/UserList/UserList';
import { searchStore } from '../stores/storeSearch';
import { userListStore } from '../stores/storeUserList';
import { dispatcher } from '../dispatcher/dispatcher';
import { HashtagParser } from '../utils/hashtagParser';

export class SearchView extends BaseView {
    private postsView: PostsView | null = null;
    private contentWrapper: HTMLElement | null = null;
    private boundSearchStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;
    private hasInitializedSearch: boolean = false;
    private currentQuery: string = '';
    private isHandlingStoreUpdate: boolean = false;

    constructor() {
        super();
        this.postsView = new PostsView();
        this.boundSearchStoreHandler = this.handleSearchStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    protected determineCurrentCategory(): void {
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        await this.renderPageLayout();
        
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
            searchStore.addListener(this.boundSearchStoreHandler);
            userListStore.addListener(this.boundUserListStoreHandler); // Подписываемся на топ-блоги
        }

        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'search-page';
        return this.contentWrapper;
    }

    private handleSearchStoreChange(): void {
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

    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;
        // Обновляем топ-блоги в правой колонке
        this.updateUserListContent();
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
        
        // Определяем, это поиск по хештегу или обычный
        if (HashtagParser.isHashtagSearch(state.query)) {
            const cleanHashtag = HashtagParser.extractHashtagFromQuery(state.query);
            titleEl.textContent = `Посты с хештегом: #${cleanHashtag}`;
        } else {
            titleEl.textContent = `Результаты поиска: "${state.query}"`;
        }
        
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

        // Определяем тип поиска для заголовка загрузки
        const isHashtagSearch = HashtagParser.isHashtagSearch(query);
        const displayQuery = isHashtagSearch ? 
            `#${HashtagParser.extractHashtagFromQuery(query)}` : 
            query;

        this.contentWrapper.innerHTML = `
            <div class="search-loading-state">
                <h1 class="search-loading-state__title">Поиск: "${displayQuery}"</h1>
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

        // Определяем тип поиска для сообщения
        const isHashtagSearch = HashtagParser.isHashtagSearch(query);
        const displayQuery = isHashtagSearch ? 
            `#${HashtagParser.extractHashtagFromQuery(query)}` : 
            query;
        
        const message = isHashtagSearch ? 
            `По хештегу "${displayQuery}" не найдено ни авторов, ни постов` :
            `По запросу "${displayQuery}" не найдено ни авторов, ни постов`;

        const noResultsEl = document.createElement('div');
        noResultsEl.className = 'search-no-results';
        noResultsEl.innerHTML = `
            <div class="search-no-results__content">
                <h2 class="search-no-results__title">Ничего не найдено</h2>
                <p class="search-no-results__text">${message}</p>
                <p class="search-no-results__suggestion">Попробуйте изменить запрос или посмотрите популярные темы в категориях слева</p>
            </div>
        `;
        this.contentWrapper.appendChild(noResultsEl);
    }

    destroy(): void {
        super.destroy();
        
        searchStore.removeListener(this.boundSearchStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler); // Отписываемся
        
        if (this.postsView) {
            this.postsView.destroy();
            this.postsView = null;
        }
        
        this.hasInitializedSearch = false;
        this.currentQuery = '';
        this.isHandlingStoreUpdate = false;
        this.contentWrapper = null;
    }
}