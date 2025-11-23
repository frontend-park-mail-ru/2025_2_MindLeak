// views/viewPost.ts
import { Header } from '../components/Header/Header';
import { UserList } from '../components/UserList/UserList';
import { dispatcher } from '../dispatcher/dispatcher';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { PostCard, PostCardProps } from '../components/PostCard/PostCard';
import { postStore, Post } from '../stores/storePost';
import { loginStore } from '../stores/storeLogin';
import { userListStore } from '../stores/storeUserList'; // ← добавлено

export class PostView {
    private container: HTMLElement;
    private postId: string;
    private headerInstance: Header;
    private postCard: PostCard | null = null;
    private boundPostStoreHandler: () => void;
    private boundUserListStoreHandler: () => void; // ← добавлено
    private rightMenu: HTMLElement | null = null;  // ← добавлено

    constructor(container: HTMLElement, params: { id: string }) {
        this.container = container;
        this.postId = params.id;
        this.headerInstance = new Header();
        this.boundPostStoreHandler = this.handlePostStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this); // ← добавлено
        postStore.addListener(this.boundPostStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler); // ← добавлено
    }

    async render(): Promise<HTMLElement> {
        // Запускаем загрузку поста
        dispatcher.dispatch('POST_LOAD_REQUEST', { postId: this.postId });
        // Запускаем загрузку топ-блогеров
        dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });

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

        postWrapper.innerHTML = `
            <div class="post-view__loader" style="text-align: center; padding: 40px;">
                Загрузка поста...
            </div>
        `;

        pageElement.appendChild(postWrapper);

        // Правое меню — сохраняем ссылку
        this.rightMenu = document.createElement('aside');
        this.rightMenu.className = 'sidebar-right';

        contentContainer.appendChild(leftMenu);
        contentContainer.appendChild(pageElement);
        contentContainer.appendChild(this.rightMenu);

        // Инициализируем правое меню сразу (можно и в handleUserListStoreChange)
        this.updateUserListContent();

        return rootElem;
    }

    private handlePostStoreChange(): void {
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

    // ← НОВЫЙ обработчик для топ-блогеров
    private handleUserListStoreChange(): void {
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        if (!this.rightMenu) return;

        // Удаляем старый список, если есть
        const oldContent = this.rightMenu.querySelector('.user-list');
        if (oldContent) oldContent.remove();

        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error in PostView:', state.error);
            return;
        }

        const userList = new UserList({
            title: 'Топ блогов',
            users: state.users || []
        });
        const userListElement = await userList.render();
        this.rightMenu.appendChild(userListElement);
    }

    private async renderPostInWrapper(post: Post, wrapper: HTMLElement): Promise<void> {
        const authState = loginStore.getState();
        const currentUserId = authState.user?.id;
        const isOwnPost = !!currentUserId && currentUserId.toString() === post.authorId.toString();

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
            wrapper.innerHTML = `
                <div class="post-view__error" style="text-align: center; padding: 40px; color: var(--text-failure);">
                    Не удалось отобразить пост
                </div>
            `;
        }
    }

    destroy(): void {
        this.headerInstance.destroy();
        postStore.removeListener(this.boundPostStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler); // ← важно!
        this.postCard = null;
        this.rightMenu = null;
    }
}