// views/viewPost.ts
import { BaseView } from './viewBase';
import { PostCard, PostCardProps } from '../components/PostCard/PostCard';
import { dispatcher } from '../dispatcher/dispatcher';
import { postStore, Post } from '../stores/storePost';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList';
import { HashtagParser } from '../utils/hashtagParser';

export class PostView extends BaseView {
    private postId: string;
    private postCard: PostCard | null = null;
    private boundPostStoreHandler: () => void;
    private postWrapper: HTMLElement | null = null;
    private container: HTMLElement;
    private boundUserListStoreHandler: () => void;

    constructor(container: HTMLElement, params: { id: string }) {
        super();
        this.container = container;
        this.postId = params.id;
        this.boundPostStoreHandler = this.handlePostStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
        
        // Подписываемся ТОЛЬКО на postStore
        postStore.addListener(this.boundPostStoreHandler);
    }

    /**
     * Переопределяем определение категории для страницы поста
     */
    protected determineCurrentCategory(): void {
        // Для страницы поста устанавливаем пустую категорию,
        // чтобы ни один пункт меню не был активным
        this.currentCategory = '';
    }

    async render(): Promise<HTMLElement> {
        this.isDestroyed = false;
        
        // Запускаем загрузку поста
        dispatcher.dispatch('POST_LOAD_REQUEST', { postId: this.postId });
        
        // Рендерим базовую структуру
        await this.renderPageLayout();
        
        // Подписываемся на обновления userListStore
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // Добавляем контент в container
        if (this.container && this.rootElement) {
            this.container.appendChild(this.rootElement);
        }
        
        return this.rootElement!;
    }

    protected async renderMainContent(): Promise<HTMLElement> {
        const pageElement = document.createElement('main');
        pageElement.className = 'main-content';

        this.postWrapper = document.createElement('div');
        this.postWrapper.className = 'post-wrapper';
        this.postWrapper.id = 'post-wrapper';

        // Показываем загрузку
        this.postWrapper.innerHTML = `
            <div class="post-view__loader" style="text-align: center; padding: 40px;">
                Загрузка поста...
            </div>
        `;

        pageElement.appendChild(this.postWrapper);
        return pageElement;
    }

    private handlePostStoreChange(): void {
        if (this.isDestroyed || !this.postWrapper) return;

        const state = postStore.getState();

        if (state.isLoading) {
            this.postWrapper.innerHTML = `
                <div class="post-view__loader" style="text-align: center; padding: 40px;">
                    Загрузка поста...
                </div>
            `;
            return;
        }

        if (state.error) {
            this.postWrapper.innerHTML = `
                <div class="post-view__error" style="text-align: center; padding: 40px; color: var(--text-failure);">
                    ${state.error}
                </div>
            `;
            return;
        }

        if (state.post) {
            this.renderPostInWrapper(state.post, this.postWrapper);
        }
    }

    private handleUserListStoreChange(): void {
        if (this.isDestroyed) return;
        // Используем метод из BaseView
        this.updateUserListContent();
    }

    private async renderPostInWrapper(post: Post, wrapper: HTMLElement): Promise<void> {
        const authState = loginStore.getState();
        const currentUserId = authState.user?.id;
        const isOwnPost = !!currentUserId && currentUserId.toString() === post.authorId.toString();

        // Обрабатываем хештеги в заголовке и тексте
        const processedTitle = HashtagParser.replaceHashtagsWithLinks(post.title || '');
        const processedText = HashtagParser.replaceHashtagsWithLinks(post.content || '');

        const postData: PostCardProps = {
            postId: post.id,
            authorId: post.authorId,
            user: {
                name: post.authorName || 'Аноним',
                subtitle: post.theme || 'Блог',
                avatar: post.authorAvatar || '/img/defaultAvatar.jpg',
                isSubscribed: false,
                id: post.authorId
            },
            title: processedTitle,
            text: processedText,
            tags: Array.isArray(post.tags) ? post.tags : [],
            commentsCount: post.commentsCount || 0,
            repostsCount: post.repostsCount || 0,
            viewsCount: post.viewsCount || 0,
            isOwnPost: isOwnPost
        };

        try {
            this.postCard = new PostCard(postData);
            const postElement = await this.postCard.render();
            wrapper.innerHTML = '';
            wrapper.appendChild(postElement);
        } catch (error) {
            console.error('Error rendering post:', error);
            wrapper.innerHTML = `
                <div class="post-view__error" style="text-align: center; padding: 40px; color: var(--text-failure);">
                    Не удалось отобразить пост
                </div>
            `;
        }
    }

    destroy(): void {
        // Отписываемся от userListStore
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        // Отписываемся от postStore
        postStore.removeListener(this.boundPostStoreHandler);
        
        super.destroy();
        
        // Очищаем ссылки
        this.postCard = null;
        this.postWrapper = null;
        
        // Удаляем из container
        if (this.container && this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
    }
}