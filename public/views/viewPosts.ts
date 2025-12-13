// views/viewPosts.ts
import { PostCard, PostCardProps } from '../components/PostCard/PostCard';
import { dispatcher } from '../dispatcher/dispatcher';
import { postsStore, Post } from '../stores/storePosts';
import { loginStore } from '../stores/storeLogin';
import { HashtagParser } from '../utils/hashtagParser'; // Добавляем импорт
import { subscriptionsStore } from '../stores/storeSubscriptions';
import { SubscriptionHelper } from '../utils/subscriptionHelper';

export class PostsView {
    private feedWrapper: HTMLElement | null = null;
    private sentinel: HTMLElement | null = null;
    private observer: IntersectionObserver | null = null;
    private virtualPostIndex: number = 0;
    private allPosts: Post[] = [];
    private boundStoreHandler: () => void;
    private currentFilter: string = 'fresh';
    private isInitialized: boolean = false;

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        this.handlePostAction = this.handlePostAction.bind(this);
        this.initStoreListener();
    }

    private initStoreListener(): void {
        postsStore.addListener(this.boundStoreHandler);
    }

    // ОСНОВНОЙ метод - для обычного использования (сам загружает данные)
    public async init(feedWrapper?: HTMLElement): Promise<void> {
        if (feedWrapper) {
            this.feedWrapper = feedWrapper;
        } else {
            this.feedWrapper = document.getElementById('feed-wrapper');
        }
        
        if (!this.feedWrapper) {
            throw new Error('Feed wrapper not found');
        }

        this.cleanupScroll();

        // Определяем категорию из URL
        const url = new URL(window.location.href);
        const pathname = url.pathname;
        const topic = url.searchParams.get('topic');
        
        if (pathname === '/feed/category' && topic) {
            this.currentFilter = topic;
            dispatcher.dispatch('POSTS_LOAD_REQUEST', { filter: topic });
        } else {
            // Для '/' и '/feed' используем свежее
            this.currentFilter = 'fresh';
            dispatcher.dispatch('POSTS_LOAD_REQUEST', { filter: 'fresh' });
        }

        this.setupInfiniteScroll();
        this.isInitialized = true;
    }

    // НОВЫЙ метод - для использования готовых постов (для поиска)
    public async initWithPosts(feedWrapper: HTMLElement, externalPosts: Post[]): Promise<void> {
        console.log('🔍 PostsView: initWithPosts called with posts:', externalPosts);
        
        this.feedWrapper = feedWrapper;
        this.cleanupScroll();

        if (externalPosts && externalPosts.length > 0) {
            this.allPosts = externalPosts;
            console.log('📝 PostsView: Rendering', this.allPosts.length, 'posts');
            await this.renderAllPosts();
            this.isInitialized = true;
            return;
        }

        console.log('📭 PostsView: No external posts provided');
        this.showEmptyMessage();
        this.isInitialized = true;
    }

    private async renderAllPosts(): Promise<void> {
        if (!this.feedWrapper) {
            console.error('❌ PostsView: No feed wrapper');
            return;
        }

        console.log('🎨 PostsView: Starting to render', this.allPosts.length, 'posts');
        
        this.feedWrapper.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        let renderedCount = 0;
        
        for (const apiPost of this.allPosts) {
            console.log('📄 Processing post:', apiPost);
            
            const postData = await this.transformPost(apiPost);
            console.log('🔄 Transformed post data:', postData);
            
            const postCard = new PostCard({
                ...postData,
                onMenuAction: (action) => this.handlePostAction(action, apiPost.id)
            });
            
            try {
                const postElement = await postCard.render(); // ← ТУТ НУЖЕН async
                fragment.appendChild(postElement);
                renderedCount++;
                console.log('✅ Post rendered successfully');
            } catch (error) {
                console.error('❌ Error rendering post:', error, apiPost);
            }
        }

        this.feedWrapper.appendChild(fragment);
        console.log(`🎉 PostsView: Rendered ${renderedCount} out of ${this.allPosts.length} posts`);
    }

    private showEmptyMessage(): void {
        if (!this.feedWrapper) return;
        
        this.feedWrapper.innerHTML = '';
        const emptyEl = document.createElement('div');
        emptyEl.className = 'feed-empty';
        emptyEl.textContent = 'Постов не найдено';
        this.feedWrapper.appendChild(emptyEl);
    }

    private setupInfiniteScroll(): void {
        if (!this.feedWrapper) return;

        // Очищаем предыдущий sentinel
        if (this.sentinel) {
            this.sentinel.remove();
        }

        this.sentinel = document.createElement('div');
        this.sentinel.style.height = '20px';
        this.sentinel.className = 'scroll-sentinel';
        
        this.feedWrapper.appendChild(this.sentinel);

        // Очищаем предыдущий observer
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.allPosts.length > 0 && this.isInitialized) {
                this.renderNextPosts();
            }
        }, {
            rootMargin: '100px'
        });

        if (this.sentinel) {
            this.observer.observe(this.sentinel);
        }
    }

    private cleanupScroll(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.sentinel) {
            this.sentinel.remove();
            this.sentinel = null;
        }
    }

    private handleStoreChange(): void {
        const state = postsStore.getState();

        // Сброс при смене фильтра
        if (this.currentFilter !== state.currentFilter) {
            this.currentFilter = state.currentFilter;
            this.virtualPostIndex = 0;
            
            if (this.feedWrapper) {
                this.feedWrapper.innerHTML = '';
                if (this.sentinel) {
                    this.feedWrapper.appendChild(this.sentinel);
                }
            }
        }

        // Если посты изменились или это первая загрузка
        if (state.posts.length > 0 && !state.isLoading) {
            this.allPosts = [...state.posts];
            
            // Всегда полностью перерисовываем при получении новых данных
            if (this.feedWrapper) {
                this.feedWrapper.innerHTML = '';
                if (this.sentinel) {
                    this.feedWrapper.appendChild(this.sentinel);
                }
            }
            this.virtualPostIndex = 0;
            this.renderNextPosts();
        }

        if (state.error) {
            this.showError(state.error);
        }
    }

    private async transformPost(apiPost: Post): Promise<PostCardProps> {
        const authState = loginStore.getState();
        const currentUserId = authState.user?.id;

        const isOwnPost = !!currentUserId && 
            String(currentUserId) === String(apiPost.authorId);
        
        const isMyProfile = isOwnPost;

        const isSubscribed = await SubscriptionHelper.getSubscriptionFlag(String(apiPost.authorId));

        const finalIsSubscribed = isSubscribed;

        console.log('🔄 [PostsView] Subscription status (FIXED):', {
            authorId: apiPost.authorId,
            serverFlag: apiPost.isAuthorSubscribed,
            storeFlag: isSubscribed,
            finalFlag: finalIsSubscribed,
            rule: 'ALWAYS USE STORE FLAG'
        });

        // Обрабатываем хештеги в заголовке и тексте
        const processedTitle = HashtagParser.replaceHashtagsWithLinks(apiPost.title || '');
        const processedText = HashtagParser.replaceHashtagsWithLinks(apiPost.content || '');

        return {
            postId: apiPost.id || '',
            authorId: apiPost.authorId,
            user: {
                name: apiPost.authorName || 'Аноним',
                subtitle: apiPost.theme || 'Блог',
                avatar: apiPost.authorAvatar || '/img/defaultAvatar.jpg',
                isSubscribed: finalIsSubscribed, // Используем исправленный флаг
                id: apiPost.authorId,
                hideSubscribeButton: isMyProfile,
                isMyProfile: isMyProfile
            },
            title: processedTitle,
            text: processedText,
            image: apiPost.image || '',
            tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
            commentsCount: apiPost.commentsCount || 0,
            repostsCount: apiPost.repostsCount || 0,
            viewsCount: apiPost.viewsCount || 0,
            isOwnPost: isOwnPost,
            canEdit: isOwnPost,
            onMenuAction: (action) => this.handlePostAction(action, apiPost.id)
        };
    }

    private async renderNextPosts(): Promise<void> {
        if (!this.feedWrapper || this.allPosts.length === 0) return;

        await SubscriptionHelper.waitForSubscriptions();

        const POSTS_PER_LOAD = 10;
        const fragment = document.createDocumentFragment();
        
        let postsRendered = 0;
        for (let i = 0; i < POSTS_PER_LOAD; i++) {
            // Если дошли до конца массива, останавливаемся
            if (this.virtualPostIndex >= this.allPosts.length) {
                break;
            }
            
            const apiPost = this.allPosts[this.virtualPostIndex];
            
            const postData = await this.transformPost(apiPost);
            
            try {
                const postCard = new PostCard({
                    ...postData,
                    onMenuAction: (action) => this.handlePostAction(action, apiPost.id)
                });
                const postElement = await postCard.render();
                fragment.appendChild(postElement);
                postsRendered++;
            } catch (error) {
                console.error('❌ Error rendering post in renderNextPosts:', error);
            }
            
            this.virtualPostIndex++;
        }

        if (postsRendered > 0) {
            if (this.sentinel) {
                this.feedWrapper.insertBefore(fragment, this.sentinel);
            } else {
                this.feedWrapper.appendChild(fragment);
            }
        }
    }

    private showError(message: string): void {
        if (!this.feedWrapper) return;

        this.feedWrapper.innerHTML = '';
        
        const errorEl = document.createElement('div');
        errorEl.className = 'feed-error';
        errorEl.textContent = message;
        this.feedWrapper.appendChild(errorEl);
    }

    destroy(): void {
        postsStore.removeListener(this.boundStoreHandler);
        this.cleanupScroll();
        this.feedWrapper = null;
        this.allPosts = [];
        this.virtualPostIndex = 0;
        this.isInitialized = false;
        
        // Сбрасываем SubscriptionHelper
        SubscriptionHelper.reset();
    }

    private handlePostAction(action: string, postId?: string): void {
        if (!postId) return;

        switch (action) {
            case 'edit':
                dispatcher.dispatch('POST_EDIT_REQUEST', { postId });
                break;
            case 'hide':
                dispatcher.dispatch('POST_HIDE_REQUEST', { postId });
                break;
            case 'report':
                dispatcher.dispatch('POST_REPORT_REQUEST', { postId });
                break;
        }
    }
}