// views/viewUserList.ts

import { UserList } from '../components/UserList/UserList';
import { Header } from '../components/Header/Header';
import { userListStore, UserListState } from '../stores/storeUserList';
import { dispatcher } from '../dispatcher/dispatcher';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';

export class UserListView {
  private container: HTMLElement;
  private boundStoreHandler: () => void;
  private sidebarMenu: SidebarMenu | null = null;
  private headerInstance: Header;
  private pageWrapper: HTMLElement | null = null;
  private currentCategory: string = '';
  private listType: 'topblogs' | 'subscriptions' | 'subscribers' = 'topblogs'; // Тип списка

  constructor(container: HTMLElement, listType: 'topblogs' | 'subscriptions' | 'subscribers' = 'topblogs') {
    this.container = container;
    this.headerInstance = new Header();
    this.boundStoreHandler = this.handleStoreChange.bind(this);
    this.listType = listType;
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
    await this.renderFullPage();
    userListStore.addListener(this.boundStoreHandler);
    dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: this.listType });
    return this.pageWrapper!;
  }

  private async renderFullPage(): Promise<void> {
    this.container.innerHTML = '';
    this.pageWrapper = document.createElement('div');

    const headerContainer = document.createElement('header');
    const headerEl = await this.headerInstance.render(headerContainer);
    headerContainer.appendChild(headerEl);
    this.pageWrapper.appendChild(headerContainer);

    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-layout';

    const leftMenu = document.createElement('aside');
    leftMenu.className = 'sidebar-left';

    let sidebarEl1: HTMLElement | null = null;
    let sidebarEl2: HTMLElement | null = null;

    const deactivateAll = (sidebarEl: HTMLElement) => {
      sidebarEl.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('menu-item--active');
      });
    };

    // Левое меню
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

    // Нижнее меню
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

    const mainContent = document.createElement('main');
    mainContent.className = 'main-content';

    const userListContent = await this.renderUserListContent();
    mainContent.appendChild(userListContent);

    const rightMenu = document.createElement('aside');
    rightMenu.className = 'sidebar-right';

    contentContainer.appendChild(leftMenu);
    contentContainer.appendChild(mainContent);
    contentContainer.appendChild(rightMenu);

    this.pageWrapper.appendChild(contentContainer);
    this.container.appendChild(this.pageWrapper);
  }

  private async renderUserListContent(): Promise<HTMLElement> {
    const currentState = userListStore.getState();
    const title = this.getTitleByType(this.listType);
    const userListComponent = new UserList({
      title: title,
      users: currentState.users || []
    });
    const element = await userListComponent.render();
    return element;
  }

  private getTitleByType(type: 'topblogs' | 'subscriptions' | 'subscribers'): string {
    switch (type) {
      case 'topblogs':
        return 'Топ блогов';
      case 'subscriptions':
        return 'Подписки';
      case 'subscribers':
        return 'Подписчики';
      default:
        return 'Список пользователей';
    }
  }

  private handleStoreChange(): void {
    const state = userListStore.getState();
    if (state.error) {
      console.error('UserList error:', state.error);
    }
    this.updateUserListContent();
  }

  private async updateUserListContent(): Promise<void> {
    if (!this.pageWrapper) return;
    const mainContent = this.pageWrapper.querySelector('.main-content');
    if (mainContent) {
      const oldContent = mainContent.querySelector('.user-list');
      if (oldContent) {
        oldContent.remove();
      }
      const newContent = await this.renderUserListContent();
      mainContent.appendChild(newContent);
    }
  }

  destroy(): void {
    userListStore.removeListener(this.boundStoreHandler);
    this.headerInstance.destroy();
  }
}