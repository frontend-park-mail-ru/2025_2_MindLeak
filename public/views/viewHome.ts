import { Header } from '../components/Header/Header';
import { UserList } from '../components/UserList/UserList';
import { dispatcher } from '../dispatcher/dispatcher';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { CreatePostFormView } from '../views/viewCreatePostForm';
import { userListStore } from '../stores/storeUserList';

export class HomeView {
    private headerInstance: Header;
    private postsView: PostsView | null = null;
    private feedWrapper: HTMLElement | null = null;
    private currentCategory: string = 'fresh';
    private createPostFormView: CreatePostFormView | null = null; 
    private boundStoreHandler: () => void;
    private userListElement: HTMLElement | null = null; // Добавляем ссылку на текущий UserList
    private isUserListRendered: boolean = false; // Флаг чтобы отслеживать рендер UserList

    constructor() {
        this.headerInstance = new Header();
        this.postsView = new PostsView();
        this.determineCurrentCategory();
        this.createPostFormView = new CreatePostFormView();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
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
        
        // Отправляем в store текущий фильтр
        dispatcher.dispatch('POSTS_SET_FILTER', { filter: this.currentCategory });
    }

    async render(): Promise<HTMLElement> {
        // Определяем категорию перед рендером
        this.determineCurrentCategory();

        const rootElem = document.createElement('div');
        
        // header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        rootElem.appendChild(headerContainer);

        // основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        rootElem.appendChild(contentContainer);

        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        let sidebarEl1: HTMLElement | null = null;
        let sidebarEl2: HTMLElement | null = null;

        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // левое меню - передаем текущую категорию для подсветки
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl2) deactivateAll(sidebarEl2);
                
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
        sidebarEl1 = await sidebar1.render();

        // нижнее меню - также передаем текущую категорию
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            this.currentCategory,
            (key) => {
                if (sidebarEl1) deactivateAll(sidebarEl1);
                
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
        
        // Загружаем топ блогов только если еще не загружали
        if (!this.isUserListRendered) {
            dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
            this.isUserListRendered = true;
        }

        // инициализация feed
        try {
            if (this.postsView) {
                await this.postsView.init(this.feedWrapper);
            }
        } catch (error) {
            const errorEl = document.createElement('div');
            errorEl.className = 'feed-error';
            errorEl.textContent = 'Не удалось загрузить ленту постов';
            if (this.feedWrapper) {
                this.feedWrapper.appendChild(errorEl);
            }
        }

        return rootElem;
    }

    private handleStoreChange(): void {
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        const rightMenu = this.feedWrapper?.closest('.content-layout')?.querySelector('.sidebar-right') || 
                         document.querySelector('.sidebar-right');
        
        if (!rightMenu) return;

        // Удаляем старый UserList если он есть
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }

        const newList = new UserList({
            title: 'Топ блогов',
            users: userListStore.getState().users || []
        });
        
        this.userListElement = await newList.render();
        rightMenu.appendChild(this.userListElement);
    }

    destroy(): void {
        this.headerInstance.destroy();
        if (this.postsView) {
            this.postsView.destroy();
            this.postsView = null;
        }
        if (this.createPostFormView) {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
        
        // Очищаем UserList при уничтожении
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }
        
        this.isUserListRendered = false;
        userListStore.removeListener(this.boundStoreHandler);
    }
}