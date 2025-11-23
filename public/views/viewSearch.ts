import { Header } from '../components/Header/Header';
import { UserList } from '../components/UserList/UserList';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { searchStore } from '../stores/storeSearch';
import { dispatcher } from '../dispatcher/dispatcher';
import { userListStore } from '../stores/storeUserList';

export class SearchView {
    private headerInstance: Header;
    private postsView: PostsView | null = null;
    private contentWrapper: HTMLElement | null = null;
    private boundStoreHandler: () => void;
    private boundUserListHandler: () => void;
    private userListElement: HTMLElement | null = null;
    private isUserListRendered: boolean = false;

    constructor() {
        this.headerInstance = new Header();
        this.postsView = new PostsView();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.boundUserListHandler = this.handleUserListChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
        const rootElem = document.createElement('div');
        
        // Header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        rootElem.appendChild(headerContainer);

        // Основной контент с такой же структурой как HomeView
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        rootElem.appendChild(contentContainer);

        // Левое меню (категории)
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

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

        // Подписываемся на stores
        searchStore.addListener(this.boundStoreHandler);
        userListStore.addListener(this.boundUserListHandler);
        
        // Загружаем топ блогов для правого меню
        if (!this.isUserListRendered) {
            dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
            this.isUserListRendered = true;
        }

        // Загружаем результаты поиска
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q') || '';
        
        if (query) {
            dispatcher.dispatch('SEARCH_BLOGS_REQUEST', { query });
            dispatcher.dispatch('SEARCH_POSTS_REQUEST', { query });
        } else {
            this.showEmptySearch();
        }

        return rootElem;
    }

    private handleStoreChange(): void {
        const state = searchStore.getState();
        this.updateSearchResults(state);
    }

    private handleUserListChange(): void {
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        const rightMenu = this.contentWrapper?.closest('.content-layout')?.querySelector('.sidebar-right') || 
                         document.querySelector('.sidebar-right');
        
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
        if (!this.contentWrapper) return;

        this.contentWrapper.innerHTML = '';

        console.log('🔍 SearchView: Updating results with state:', state); // Добавляем лог

        // Заголовок поиска
        const titleEl = document.createElement('h1');
        titleEl.className = 'search-page__title';
        titleEl.textContent = `Результаты поиска: "${state.query}"`;
        this.contentWrapper.appendChild(titleEl);

        let hasResults = false;

        // Секция авторов
        console.log('👥 Authors found:', state.blogs.length, state.blogs); // Лог авторов
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
        console.log('📝 Posts found:', state.posts.length, state.posts); // Лог постов
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
        console.log('📊 Total results:', hasResults, 'Loading:', state.isLoading); // Лог статуса
        if (!hasResults && !state.isLoading) {
            console.log('❌ Showing no results message'); // Лог сообщения
            this.showNoResults(state.query);
        }
    }

    private showEmptySearch(): void {
        if (!this.contentWrapper) return;

        this.contentWrapper.innerHTML = `
            <div class="search-empty-state">
                <h1 class="search-empty-state__title">Поиск</h1>
                <p class="search-empty-state__text">Введите запрос в поисковой строке чтобы найти авторов и посты</p>
            </div>
        `;
    }

    private showNoResults(query: string): void {
        if (!this.contentWrapper) return;

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
        this.headerInstance.destroy();
        if (this.postsView) {
            this.postsView.destroy();
        }
        searchStore.removeListener(this.boundStoreHandler);
        userListStore.removeListener(this.boundUserListHandler);
        
        if (this.userListElement) {
            this.userListElement.remove();
        }
        
        this.isUserListRendered = false;
    }
}