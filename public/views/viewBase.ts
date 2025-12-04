// views/BaseView.ts
import { Header } from '../components/Header/Header';
import { UserList } from '../components/UserList/UserList';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { userListStore } from '../stores/storeUserList';
import { dispatcher } from '../dispatcher/dispatcher';
import { HashtagParser } from '../utils/hashtagParser';

export abstract class BaseView {
    protected headerInstance: Header;
    protected rootElement: HTMLElement | null = null;
    protected pageWrapper: HTMLElement | null = null;
    protected contentContainer: HTMLElement | null = null;
    protected mainContent: HTMLElement | null = null;
    protected rightMenu: HTMLElement | null = null;
    protected userListElement: HTMLElement | null = null;
    protected isUserListRendered: boolean = false;
    protected isDestroyed: boolean = false;
    protected currentCategory: string = 'fresh';
    protected sidebarEl1: HTMLElement | null = null;
    protected sidebarEl2: HTMLElement | null = null;
    
    // Статическое поле для Header синглтона (если нужно)
    private static headerInstance: Header | null = null;

    constructor() {
        // Используем синглтон для Header
        if (!BaseView.headerInstance) {
            BaseView.headerInstance = new Header();
        }
        this.headerInstance = BaseView.headerInstance;
    }

    /**
     * Абстрактный метод для рендера основного контента
     */
    protected abstract renderMainContent(): Promise<HTMLElement>;

    /**
     * Основной метод рендера страницы
     */
    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        await this.renderPageLayout();
        return this.rootElement!;
    }

    /**
     * Рендер общей структуры страницы
     */
    protected async renderPageLayout(): Promise<void> {
        this.rootElement = document.createElement('div');
        
        // Header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        this.rootElement.appendChild(headerContainer);

        // Основной контент
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'content-layout';
        this.rootElement.appendChild(this.contentContainer);

        // Левое меню
        const leftMenu = await this.renderLeftMenu();
        this.contentContainer.appendChild(leftMenu);

        // Центральная область
        this.mainContent = document.createElement('main');
        this.mainContent.className = 'main-content';
        const mainContentElement = await this.renderMainContent();
        this.mainContent.appendChild(mainContentElement);
        this.contentContainer.appendChild(this.mainContent);

        // Правое меню
        this.rightMenu = document.createElement('aside');
        this.rightMenu.className = 'sidebar-right';
        this.contentContainer.appendChild(this.rightMenu);

        // Инициализация UserList
        await this.initUserList();
    }

    /**
     * Рендер левого меню (сайдбара)
     */
    protected async renderLeftMenu(): Promise<HTMLElement> {
        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        // Определяем текущую категорию из URL (переопределяется в наследниках)
        this.determineCurrentCategory();

        // Функция для сброса активности
        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // Верхнее меню
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            this.currentCategory, // Используем текущую категорию
            (key) => {
                if (this.sidebarEl2) deactivateAll(this.sidebarEl2);
                this.navigateToCategory(key);
            }
        );
        this.sidebarEl1 = await sidebar1.render();

        // Нижнее меню
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            this.currentCategory, // Используем текущую категорию
            (key) => {
                if (this.sidebarEl1) deactivateAll(this.sidebarEl1);
                this.navigateToCategory(key);
            }
        );
        this.sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(this.sidebarEl1);
        leftMenu.appendChild(this.sidebarEl2);

        return leftMenu;
    }

    /**
     * Навигация по категориям
     */
    protected navigateToCategory(key: string): void {
        let newUrl = '';
        if (key === 'fresh') {
            newUrl = '/feed';
        } else {
            newUrl = `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
        }
        window.history.pushState({}, '', newUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    /**
     * Определение текущей категории из URL
     * Должен быть переопределен в наследниках при необходимости
     */
    protected determineCurrentCategory(): void {
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        
        if (pathname === '/' || pathname === '/feed') {
            this.currentCategory = 'fresh';
        } else if (pathname === '/feed/category') {
            const topicParam = url.searchParams.get('topic');
            this.currentCategory = topicParam || 'fresh';
        }
        // Для других страниц по умолчанию оставляем 'fresh' или пустую строку
    }

    /**
     * Инициализация UserList в правом меню
     */
    protected async initUserList(): Promise<void> {
        if (!this.isUserListRendered && !this.isDestroyed) {
            dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
            this.isUserListRendered = true;
        }
    }

    /**
     * Обновление UserList при изменении store
     */
    protected async updateUserListContent(users?: any[]): Promise<void> {
        if (this.isDestroyed || !this.rightMenu) return;
        
        // Удаляем старый UserList если он есть
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }

        const state = userListStore.getState();
        const usersToRender = users || state.users;
        
        // Рендерим только если есть пользователи
        if (usersToRender && usersToRender.length > 0) {
            const newList = new UserList({
                title: 'Топ блогов',
                users: usersToRender
            });
            
            this.userListElement = await newList.render();
            this.rightMenu.appendChild(this.userListElement);
        }
    }

    /**
     * Базовый метод уничтожения
     */
    destroy(): void {
        this.isDestroyed = true;
        
        // Очищаем UserList
        if (this.userListElement) {
            this.userListElement.remove();
            this.userListElement = null;
        }
        
        // Сбрасываем флаги
        this.isUserListRendered = false;
        
        // Очищаем ссылки
        this.sidebarEl1 = null;
        this.sidebarEl2 = null;
        this.mainContent = null;
        this.rightMenu = null;
        this.contentContainer = null;
        
        if (this.rootElement && this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
            this.rootElement = null;
        }
    }

    /**
     * Статический метод для очистки синглтона
     */
    public static cleanup(): void {
        if (BaseView.headerInstance) {
            BaseView.headerInstance.destroy();
            BaseView.headerInstance = null;
        }
    }
}