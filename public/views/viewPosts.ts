import { PostCard } from '../components/PostCard/PostCard';
import { dispatcher } from '../dispatcher/dispatcher';
import { postsStore } from '../stores/storePosts';

export class PostsView {
    private feedWrapper: HTMLElement | null = null;
    private sentinel: HTMLElement | null = null;
    private observer: IntersectionObserver | null = null;
    private virtualPostIndex: number = 0;
    private allPosts: any[] = [];
    private boundStoreHandler: () => void;

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
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

        this.setupInfiniteScroll();
       
        dispatcher.dispatch('POSTS_LOAD_REQUEST');
    }

    private setupInfiniteScroll(): void {
        if (!this.feedWrapper) return;

        this.sentinel = document.createElement('div');
        this.sentinel.style.height = '20px';
        this.sentinel.className = 'scroll-sentinel';
        
        this.feedWrapper.appendChild(this.sentinel);

        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && this.allPosts.length > 0) {
                this.renderNextPosts();
            }
        }, {
            rootMargin: '100px'
        });

        if (this.sentinel) {
            this.observer.observe(this.sentinel);
        }
    }

    private handleStoreChange(): void {
        const state = postsStore.getState();
        
        if (state.posts.length > 0) {
            this.allPosts = state.posts;
            this.renderNextPosts();
        }
        
        if (state.error) {
            this.showError(state.error);
        }
    }

    private transformPost(apiPost: any): any {
        return {
            user: {
                name: apiPost.author_name || 'Аноним',
                subtitle: 'Блог',
                avatar: apiPost.author_avatar || '/img/LogoMain.svg',
                isSubscribed: false,
                id: apiPost.author_id
            },
            title: apiPost.title || '',
            text: apiPost.content || '',
            image: apiPost.image?.trim() || '',
            tags: ['технологии', 'программирование'],
            commentsCount: 12,
            repostsCount: 4,
            viewsCount: 1100
        };
    }

    private async renderNextPosts(): Promise<void> {
        if (!this.feedWrapper || this.allPosts.length === 0) return;

        const POSTS_PER_LOAD = 3;
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < POSTS_PER_LOAD; i++) {
            if (this.virtualPostIndex >= this.allPosts.length) {
                this.virtualPostIndex = 0; // Циклическая лента
            }
            
            const apiPost = this.allPosts[this.virtualPostIndex];
            const postData = this.transformPost(apiPost);
            
            try {
                const postCard = new PostCard(postData);
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
        if (this.observer && this.sentinel) {
            this.observer.unobserve(this.sentinel);
        }
        this.feedWrapper = null;
        this.sentinel = null;
    }
}