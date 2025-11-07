import { Header } from '../components/Header/Header';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { dispatcher } from '../dispatcher/dispatcher';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';


export class HomeView {
    private headerInstance: Header;
    private postsView: PostsView;
    private feedWrapper: HTMLElement | null = null;
    private currentCategory: string = 'fresh';

    constructor() {
        this.headerInstance = new Header();
        this.postsView = new PostsView();
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
        const topBloggers = new TopBloggers();
        const topBloggersEl = await topBloggers.render();
        rightMenu.appendChild(topBloggersEl);

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(pageElement);
        contentContainer.appendChild(rightMenu);

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

        return rootElem;
    }

    destroy(): void {
        this.headerInstance.destroy();
        this.postsView.destroy();
    }
}
