import { Header } from '../components/Header/Header';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { dispatcher } from '../dispatcher/dispatcher';
import { PostsView } from './viewPosts';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';

export class HomeView {
  private headerInstance: Header;
  private postsView: PostsView;
  private feedWrapper: HTMLElement | null = null;

  constructor() {
    this.headerInstance = new Header();
    this.postsView = new PostsView();
  }

  async render(): Promise<HTMLElement> {
    dispatcher.dispatch('POSTS_LOAD_REQUEST', { offset: 0 });

    const url = new URL(window.location.href);
    let currentFilter = 'fresh';
    
    // Извлекаем filter из query
    const filterParam = url.searchParams.get('filter');
    if (filterParam) {
        currentFilter = filterParam;
    } else if (url.pathname === '/feed') {
        currentFilter = 'fresh';
    }

    // Отправляем в store
    dispatcher.dispatch('POSTS_SET_FILTER', { filter: currentFilter });

    const rootElem = document.createElement('div');
    
    // header
    const headerContainer = document.createElement('header');
    const headerEl = await this.headerInstance.render(headerContainer);
    headerContainer.appendChild(headerEl);
    rootElem.appendChild(headerContainer);

    // oсновной контент
    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-layout';
    rootElem.appendChild(contentContainer);

    const leftMenu = document.createElement('aside');
    leftMenu.className = 'sidebar-left';

    // Сохраняем ссылки на DOM-элементы сайдбаров
    let sidebarEl1: HTMLElement | null = null;
    let sidebarEl2: HTMLElement | null = null;

    // Функция для сброса активности в сайдбаре
    const deactivateAll = (sidebarEl: HTMLElement) => {
        sidebarEl.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('menu-item--active');
        });
    };

    // левое меню
    const sidebar1 = new SidebarMenu(
        MAIN_MENU_ITEMS,
        currentFilter,
        (key) => {
          if (sidebarEl2) deactivateAll(sidebarEl2);
          
          const newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
          window.history.pushState({}, '', newUrl);
          
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
    );
    sidebarEl1 = await sidebar1.render();

    // Нижнее меню
    const sidebar2 = new SidebarMenu(
        SECONDARY_MENU_ITEMS,
        currentFilter,
        (key) => {
          if (sidebarEl1) deactivateAll(sidebarEl2);
          
          const newUrl = key === '' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
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
    
    //контейнер для постов
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

    // инициал feed через feedWrapper
    try {
      await this.postsView.init(this.feedWrapper);
      console.log('PostsView initialized successfully');
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