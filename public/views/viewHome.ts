import { Header } from '../components/Header/Header';
import { SidebarMenu } from '../components/SidebarMenu/SidebarMenu';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { PostsView } from './viewPosts';

export class HomeView {
  private headerInstance: Header;
  private postsView: PostsView;
  private feedWrapper: HTMLElement | null = null;

  constructor() {
    this.headerInstance = new Header();
    this.postsView = new PostsView();
  }

  async render(): Promise<HTMLElement> {
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

    // левое меню
    const leftMenu = document.createElement('aside');
    leftMenu.className = 'sidebar-left';
    const sidebar = new SidebarMenu();
    const sidebarEl = await sidebar.render();
    leftMenu.appendChild(sidebarEl);

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