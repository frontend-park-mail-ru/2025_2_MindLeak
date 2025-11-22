// views/viewHome.ts
import { Header } from '../components/Header/Header';
import { UserList } from '../components/UserList/UserList';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { ErrorButton } from '../components/ErrorButton/ErrorButton';
import { dispatcher } from '../dispatcher/dispatcher';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { userListStore } from '../stores/storeUserList';

export class HomeView {
    private headerInstance: Header;
    private postsView: PostsView;
    private feedWrapper: HTMLElement | null = null;
    private currentCategory: string = 'fresh';
    private pageWrapper: HTMLElement | null = null;
    private boundStoreHandler: () => void;

    constructor() {
        this.headerInstance = new Header();
        this.postsView = new PostsView();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.determineCurrentCategory();
    }

    private determineCurrentCategory(): void {
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        if (pathname === '/' || pathname === '/feed') {
            this.currentCategory = 'fresh';
        } else if (pathname === '/feed/category') {
            const topicParam = url.searchParams.get('topic');
            this.currentCategory = topicParam || 'fresh';
        }
    }

    async render(): Promise<HTMLElement> {
        this.determineCurrentCategory();

        this.pageWrapper = document.createElement('div');

        // header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        this.pageWrapper.appendChild(headerContainer);

        // основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        this.pageWrapper.appendChild(contentContainer);

        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        let sidebarEl1: HTMLElement | null = null;
        let sidebarEl2: HTMLElement | null = null;

        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // левое меню
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl2) deactivateAll(sidebarEl2);
                let newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        sidebarEl1 = await sidebar1.render();

        // нижнее меню
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl1) deactivateAll(sidebarEl1);
                let newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // центр
        const pageElement = document.createElement('main');
        pageElement.className = 'main-content';

        // контейнер для постов
        this.feedWrapper = document.createElement('div');
        this.feedWrapper.className = 'feed';
        this.feedWrapper.id = 'feed-wrapper';
        pageElement.appendChild(this.feedWrapper);

        // правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(pageElement);
        contentContainer.appendChild(rightMenu);

        // Подписываемся и запускаем загрузку топ-блогеров
        userListStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });

        // инициализация feed
        try {
            await this.postsView.init(this.feedWrapper);
            console.log('PostsView initialized successfully for category:', this.currentCategory);
        } catch (error) {
            console.error('Failed to initialize PostsView:', error);
            const errorEl = document.createElement('div');
            errorEl.className = 'feed-error';
            errorEl.textContent = 'Не удалось загрузить ленту постов';
            if (this.feedWrapper) {
                this.feedWrapper.appendChild(errorEl);
            }
        }

        return this.pageWrapper;
    }

    private handleStoreChange(): void {
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        const rightMenu = this.pageWrapper?.querySelector('.sidebar-right') || document.querySelector('.sidebar-right');
        if (!rightMenu) return;

        const oldContent = rightMenu.querySelector('.user-list');
        if (oldContent) oldContent.remove();

        const newList = new UserList({
            title: 'Топ блогов',
            users: userListStore.getState().users || []
        });
        const newElement = await newList.render();
        rightMenu.appendChild(newElement);
    }

    destroy(): void {
        userListStore.removeListener(this.boundStoreHandler);
        this.headerInstance.destroy();
        this.postsView.destroy();
    }
}