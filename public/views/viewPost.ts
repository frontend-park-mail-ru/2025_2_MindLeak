// views/viewPost.ts
import { Header } from '../components/Header/Header';
import { TopBloggers } from '../components/TopBloggers/TopBloggers';
import { dispatcher } from '../dispatcher/dispatcher';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { PostCard, PostCardProps } from '../components/PostCard/PostCard';
import { postStore, Post } from '../stores/storePost';
import { loginStore } from '../stores/storeLogin';

export class PostView {
    private container: HTMLElement;
    private postId: string;
    private headerInstance: Header;
    private postCard: PostCard | null = null;
    private boundStoreHandler: () => void;

    constructor(container: HTMLElement, params: { id: string }) {
        this.container = container;
        this.postId = params.id;
        this.headerInstance = new Header();
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        postStore.addListener(this.boundStoreHandler);
    }

    async render(): Promise<HTMLElement> {
        // Запускаем загрузку поста
        dispatcher.dispatch('POST_LOAD_REQUEST', { postId: this.postId });

        const rootElem = document.createElement('div');

        // Header
        const headerContainer = document.createElement('header');
        const headerEl = await this.headerInstance.render(headerContainer);
        headerContainer.appendChild(headerEl);
        rootElem.appendChild(headerContainer);

        // Основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        rootElem.appendChild(contentContainer);

        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';

        let sidebarEl1: HTMLElement | null = null;
        let sidebarEl2: HTMLElement | null = null;

        const deactivateAll = (sidebarEl: HTMLElement) => {
            sidebarEl.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('menu-item--active');
            });
        };

        // Левое меню — без активного состояния (мы не в ленте!)
        const sidebar1 = new SidebarMenu(
            MAIN_MENU_ITEMS,
            '',
            (key) => {
                if (sidebarEl2) deactivateAll(sidebarEl2);
                const newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        sidebarEl1 = await sidebar1.render();

        // Нижнее меню — тоже без активного состояния
        const sidebar2 = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (key) => {
                if (sidebarEl1) deactivateAll(sidebarEl1);
                const newUrl = key === 'fresh' ? '/feed' : `/feed/category?topic=${encodeURIComponent(key)}&offset=0`;
                window.history.pushState({}, '', newUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        );
        sidebarEl2 = await sidebar2.render();

        leftMenu.appendChild(sidebarEl1);
        leftMenu.appendChild(sidebarEl2);

        // Центр — один пост
        const pageElement = document.createElement('main');
        pageElement.className = 'main-content';

        const postWrapper = document.createElement('div');
        postWrapper.className = 'post-wrapper';
        postWrapper.id = 'post-wrapper';

        // Показываем загрузку
        postWrapper.innerHTML = `
            <div class="post-view__loader" style="text-align: center; padding: 40px;">
                Загрузка поста...
            </div>
        `;

        pageElement.appendChild(postWrapper);

        // Правое меню
        const rightMenu = document.createElement('aside');
        rightMenu.className = 'sidebar-right';
        const topBloggers = new TopBloggers();
        const topBloggersEl = await topBloggers.render();
        rightMenu.appendChild(topBloggersEl);

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(pageElement);
        contentContainer.appendChild(rightMenu);

        return rootElem;
    }

    private handleStoreChange(): void {
        const state = postStore.getState();

        const postWrapper = document.getElementById('post-wrapper');
        if (!postWrapper) return;

        if (state.isLoading) {
            postWrapper.innerHTML = `
                <div class="post-view__loader" style="text-align: center; padding: 40px;">
                    Загрузка поста...
                </div>
            `;
            return;
        }

        if (state.error) {
            postWrapper.innerHTML = `
                <div class="post-view__error" style="text-align: center; padding: 40px; color: var(--text-failure);">
                    ${state.error}
                </div>
            `;
            return;
        }

        if (state.post) {
            this.renderPostInWrapper(state.post, postWrapper);
        }
    }

    private async renderPostInWrapper(post: Post, wrapper: HTMLElement): Promise<void> {
        const authState = loginStore.getState();
        const currentUserId = authState.user?.id;
        const isOwnPost = !!currentUserId && currentUserId === post.authorId;

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
            title: post.title || '',
            text: post.content || '',
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
            console.error('Ошибка рендеринга поста:', error);
            wrapper.innerHTML = `
                <div class="post-view__error" style="text-align: center; padding: 40px; color: var(--text-failure);">
                    Не удалось отобразить пост
                </div>
            `;
        }
    }

    destroy(): void {
        this.headerInstance.destroy();
        postStore.removeListener(this.boundStoreHandler);
    }
}
