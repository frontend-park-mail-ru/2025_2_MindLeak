import { PostCard, PostCardProps } from '../components/PostCard/PostCard';
import { dispatcher } from '../dispatcher/dispatcher';
import { postsStore, Post } from '../stores/storePosts';
import { loginStore } from '../stores/storeLogin';

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

    public async init(feedWrapper?: HTMLElement): Promise<void> {
        if (feedWrapper) {
            this.feedWrapper = feedWrapper;
        } else {
            this.feedWrapper = document.getElementById('feed-wrapper');
        }
        
        if (!this.feedWrapper) {
            throw new Error('Feed wrapper not found');
        }

        // Очищаем предыдущий observer если был
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

        if (state.posts.length > 0) {
            this.allPosts = [...state.posts];
            // При первой загрузке рендерим первые посты
            if (this.virtualPostIndex === 0) {
                this.renderNextPosts();
            }
        }

        if (state.error) {
            this.showError(state.error);
        }
    }

    private transformPost(apiPost: Post): PostCardProps {
        const authState = loginStore.getState();
        const currentUserId = authState.user?.id;
        const isOwnPost = !!currentUserId && currentUserId.toString() === apiPost.authorId?.toString();

        return {
            postId: apiPost.id || '',
            authorId: apiPost.authorId,
            user: {
                name: apiPost.authorName || 'Аноним',
                subtitle: apiPost.theme || 'Блог',
                avatar: apiPost.authorAvatar || '/img/defaultAvatar.jpg',
                isSubscribed: false,
                id: apiPost.authorId
            },
            title: apiPost.title || '',
            text: apiPost.content || '',
            tags: Array.isArray(apiPost.tags) ? apiPost.tags : [],
            commentsCount: apiPost.commentsCount || 0,
            repostsCount: apiPost.repostsCount || 0,
            viewsCount: apiPost.viewsCount || 0,
            isOwnPost: isOwnPost
        };
    }

    private async renderNextPosts(): Promise<void> {
        if (!this.feedWrapper || this.allPosts.length === 0) return;

        const POSTS_PER_LOAD = 10;
        const fragment = document.createDocumentFragment();
        
        console.log(`🔍 [PostsView] Rendering next ${POSTS_PER_LOAD} posts from index ${this.virtualPostIndex}`);
        
        for (let i = 0; i < POSTS_PER_LOAD; i++) {
            // Циклическая логика: если дошли до конца массива, начинаем сначала
            if (this.virtualPostIndex >= this.allPosts.length) {
                this.virtualPostIndex = 0;
                console.log('🔍 [PostsView] Restarting from beginning of posts array');
            }
            
            const apiPost = this.allPosts[this.virtualPostIndex];
            console.log(`🔍 [PostsView] Rendering post ${this.virtualPostIndex}:`, apiPost.id, apiPost.title);
            
            const postData = this.transformPost(apiPost);
            
            try {
                const postCard = new PostCard({
                    ...postData,
                    onMenuAction: (action) => this.handlePostAction(action, apiPost.id)
                });
                const postElement = await postCard.render();
                fragment.appendChild(postElement);
            } catch (error) {
                console.error('Error rendering post:', error);
            }
            
            this.virtualPostIndex++;
        }

        if (this.sentinel) {
            this.feedWrapper.insertBefore(fragment, this.sentinel);
        } else {
            this.feedWrapper.appendChild(fragment);
        }
        
        console.log(`🔍 [PostsView] Next posts rendered, new index: ${this.virtualPostIndex}`);
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
    }

    private handlePostAction(action: string, postId?: string): void {
        if (!postId) return;

        switch (action) {
            case 'edit':
                dispatcher.dispatch('POST_EDIT_REQUEST', { postId });
                break;
            case 'delete':
                if (confirm('Вы уверены, что хотите удалить пост?')) {
                    dispatcher.dispatch('POST_DELETE_REQUEST', { postId });
                }
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