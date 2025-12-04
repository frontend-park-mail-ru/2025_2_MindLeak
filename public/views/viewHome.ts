// views/viewHome.ts
import { BaseView } from './viewBase';
import { PostsView } from './viewPosts';
import { CreatePostFormView } from '../views/viewCreatePostForm';
import { userListStore } from '../stores/storeUserList';

export class HomeView extends BaseView {
    private postsView: PostsView | null = null;
    private feedWrapper: HTMLElement | null = null;
    private createPostFormView: CreatePostFormView | null = null; 
    private boundStoreHandler: () => void;

    constructor() {
        super();
        this.postsView = new PostsView();
        this.createPostFormView = new CreatePostFormView();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
    }

    protected determineCurrentCategory(): void {
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        
        if (pathname === '/' || pathname === '/feed') {
            this.currentCategory = 'fresh';
        } else if (pathname === '/feed/category') {
            const topicParam = url.searchParams.get('topic');
            this.currentCategory = topicParam || 'fresh';
        }
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        // Определяем категорию перед рендером
        this.determineCurrentCategory();
        
        // Отправляем в store текущий фильтр
        const dispatcher = (await import('../dispatcher/dispatcher')).dispatcher;
        dispatcher.dispatch('POSTS_SET_FILTER', { filter: this.currentCategory });

        // контейнер для постов
        this.feedWrapper = document.createElement('div');
        this.feedWrapper.className = 'feed';
        this.feedWrapper.id = 'feed-wrapper';
        
        // Подписываемся и запускаем загрузку топ-блогеров
        userListStore.addListener(this.boundStoreHandler);
        
        // инициализация feed
        try {
            if (this.postsView) {
                await this.postsView.init(this.feedWrapper);
            }
        } catch (error) {
            const errorEl = document.createElement('div');
            errorEl.className = 'feed-error';
            errorEl.textContent = 'Не удалось загрузить ленту постов';
            this.feedWrapper.appendChild(errorEl);
        }
        
        return this.feedWrapper;
    }

    private handleStoreChange(): void {
        if (this.isDestroyed) return;
        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error:', state.error);
        }
        this.updateUserListContent();
    }

    destroy(): void {
        super.destroy();
        
        if (this.postsView) {
            this.postsView.destroy();
            this.postsView = null;
        }
        
        if (this.createPostFormView) {
            this.createPostFormView.destroy();
            this.createPostFormView = null;
        }
        
        userListStore.removeListener(this.boundStoreHandler);
    }
}