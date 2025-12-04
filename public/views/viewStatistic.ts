// views/viewStatistic.ts
import { BaseView } from './viewBase';
import { Statistic } from '../components/Statistic/Statistic';
import { router } from '../router/router';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList';

export class StatisticsView extends BaseView {
    private container: HTMLElement;
    private boundLoginStoreHandler: () => void;
    private boundUserListStoreHandler: () => void;
    private statisticsComponent: Statistic | null = null;

    constructor(container: HTMLElement) {
        super();
        this.container = container;
        this.boundLoginStoreHandler = this.handleLoginStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    /**
     * Переопределяем определение категории для страницы статистики
     */
    protected determineCurrentCategory(): void {
        // Для страницы статистики устанавливаем пустую категорию,
        // чтобы ни один пункт меню не был активным
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        
        // Подписываемся на stores
        loginStore.addListener(this.boundLoginStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // Рендерим базовую структуру
        await this.renderPageLayout();
        
        // Добавляем контент в container
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';
        
        const statisticsContent = await this.renderStatisticsMain();
        mainContent.appendChild(statisticsContent);
        return mainContent;
    }

    private async renderStatisticsMain(): Promise<HTMLElement> {
        if (this.isDestroyed) {
            return document.createElement('div');
        }

        this.statisticsComponent = new Statistic();
        const statisticsElement = await this.statisticsComponent.render();
        
        return statisticsElement;
    }

    private handleLoginStoreChange(): void {
        if (this.isDestroyed) return;
        
        const loginState = loginStore.getState();
        
        if (!loginState.isLoggedIn) {
            router.navigate('/');
        }
    }

    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    destroy(): void {
        this.isDestroyed = true;
        
        loginStore.removeListener(this.boundLoginStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        if (this.statisticsComponent) {
            this.statisticsComponent.destroy();
        }
        
        super.destroy();
        
        // Удаляем из container
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}