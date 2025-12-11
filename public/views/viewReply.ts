import { Header } from '../components/Header/Header';
import { dispatcher } from '../dispatcher/dispatcher';
import { SidebarMenu, MAIN_MENU_ITEMS, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { loginStore } from '../stores/storeLogin';
import { LoginFormView } from './viewLogin';
import { ajax } from '../modules/ajax';
import { Comment } from '../components/Comment/Comment';
import { commentsStore } from '../stores/storeComments';
import { userListStore } from '../stores/storeUserList';
import { UserList } from '../components/UserList/UserList';

export class ReplyView {
    private container: HTMLElement;
    private commentId: string;
    private postId: string = '';
    private boundCommentsStoreHandler: () => void;
    private rightMenu: HTMLElement | null = null;
    private boundUserListStoreHandler: () => void;
    private rootElement: HTMLElement | null = null;

    constructor(container: HTMLElement, params: { commentId: string }) {
        this.container = container;
        this.commentId = params.commentId;

        const urlParams = new URLSearchParams(window.location.search);
        this.postId = urlParams.get('postId') || '';

        if (!this.postId) {
            console.error('❌ postId отсутствует в URL — невозможно загрузить ответы');
        }

        this.boundCommentsStoreHandler = this.handleCommentsStoreChange.bind(this);
        this.boundUserListStoreHandler = this.handleUserListStoreChange.bind(this);
    }

    async render(): Promise<HTMLElement> {
        this.rootElement = document.createElement('div');
        
        // Header - ИСПРАВЛЕНО!
        const headerContainer = document.createElement('header');
        const header = Header.getInstance();
        
        // ✅ ИНИЦИАЛИЗИРУЕМ Header (важно!)
        await header.init(headerContainer);
        
        const headerEl = header.getElement();
        if (headerEl) {
            headerContainer.appendChild(headerEl);
            this.rootElement.appendChild(headerContainer);
        }

        // Основной контент
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-layout';
        this.rootElement.appendChild(contentContainer);

        const leftMenu = document.createElement('aside');
        leftMenu.className = 'sidebar-left';
        const sidebar1 = new SidebarMenu(MAIN_MENU_ITEMS, '', () => {});
        const sidebar2 = new SidebarMenu(SECONDARY_MENU_ITEMS, '', () => {});
        leftMenu.appendChild(await sidebar1.render());
        leftMenu.appendChild(await sidebar2.render());
        contentContainer.appendChild(leftMenu);

        // Центр — контейнер для комментария и ответов
        const main = document.createElement('main');
        main.className = 'main-content';

        const repliesContainer = document.createElement('div');
        repliesContainer.id = 'replies-container';

        // Создаём структуру: parent + форма + список ответов
        const parentSection = document.createElement('div');
        parentSection.className = 'replies-parent-section';
        repliesContainer.appendChild(parentSection);

        const repliesList = document.createElement('div');
        repliesList.className = 'replies-list';
        repliesContainer.appendChild(repliesList);

        main.appendChild(repliesContainer);
        contentContainer.appendChild(main);

        // Правое меню 
        this.rightMenu = document.createElement('aside');
        this.rightMenu.className = 'sidebar-right';

        contentContainer.appendChild(this.rightMenu);
        await this.updateUserListContent();

        // Загружаем данные
        await this.init(repliesContainer, parentSection);

        // Добавляем в контейнер
        this.container.appendChild(this.rootElement);
        
        return this.rootElement;
    }

    private async init(repliesContainer: HTMLElement, parentSection: HTMLElement): Promise<void> {
        if (!this.postId) {
            repliesContainer.innerHTML = '<div class="replies-error">Не удалось определить пост</div>';
            return;
        }

        commentsStore.addListener(this.boundCommentsStoreHandler);
        userListStore.addListener(this.boundUserListStoreHandler);
        
        // 1. Загружаем родительский комментарий отдельно
        const allCommentsRes = await ajax.get(`/comments?articleId=${this.postId}`);
        if (!allCommentsRes.data?.comments) {
            repliesContainer.innerHTML = '<div class="replies-error">Не удалось загрузить комментарии</div>';
            return;
        }

        const parent = allCommentsRes.data.comments.find((c: any) => c.id === this.commentId);
        if (!parent) {
            repliesContainer.innerHTML = '<div class="replies-error">Комментарий не найден</div>';
            return;
        }

        await this.renderParentComment(parent, parentSection);

        // 2. Загружаем ответы через store
        dispatcher.dispatch('REPLIES_LOAD_REQUEST', {
            commentId: this.commentId,
            articleId: this.postId
        });
    }

    private handleUserListStoreChange(): void {
        this.updateUserListContent();
    }

    private async updateUserListContent(): Promise<void> {
        if (!this.rightMenu) return;

        const oldContent = this.rightMenu.querySelector('.user-list');
        if (oldContent) oldContent.remove();

        const state = userListStore.getState();
        if (state.error) {
            console.error('UserList error in PostView:', state.error);
            return;
        }

        // Загружаем топ блогов если еще не загружены
        if (!state.users || state.users.length === 0) {
            dispatcher.dispatch('USER_LIST_LOAD_REQUEST', { type: 'topblogs' });
            return;
        }

        const userList = new UserList({
            title: 'Топ блогов',
            users: state.users || []
        });
        const userListElement = await userList.render();
        this.rightMenu.appendChild(userListElement);
    }
  
    private async renderParentComment(parent: any, container: HTMLElement): Promise<void> {
        const wrapper = document.createElement('div');
        wrapper.className = 'comment-wrapper comment--parent';

        const commentInstance = new Comment({
            commentId: parent.id,
            postId: this.postId,
            user: {
                name: parent.author_name,
                subtitle: '',
                avatar: parent.author_avatar || '/img/defaultAvatar.jpg',
                isSubscribed: false,
                id: parent.user_id
            },
            postTitle: parent.article_title || '',
            postDate: parent.created_at,
            text: parent.content,
            attachment: undefined,
        });

        try {
            const el = await commentInstance.render();
            wrapper.appendChild(el);
            container.appendChild(wrapper);
        } catch (error) {
            console.error('Error rendering parent comment:', error);
        }
    }

    private handleCommentsStoreChange(): void {
        const repliesList = document.querySelector('#replies-container .replies-list');
        if (!repliesList) return;
        
        console.log('handleCommentsStoreChange called');
        const state = commentsStore.getState();
        console.log('Replies to render:', state.comments);

        if (state.isLoading) {
            repliesList.innerHTML = '<div class="replies-loader">Загрузка ответов...</div>';
            return;
        }

        if (state.error) {
            repliesList.innerHTML = `<div class="replies-error">${state.error}</div>`;
            return;
        }

        repliesList.innerHTML = '';
        
        for (const reply of state.comments) {
            const wrapper = document.createElement('div');
            wrapper.className = 'comment-wrapper';
            
            const replyInstance = new Comment({
                commentId: reply.id,
                postId: this.postId,
                user: {
                    name: reply.authorName,
                    subtitle: '',
                    avatar: reply.authorAvatar || '/img/defaultAvatar.jpg',
                    isSubscribed: false,
                    id: reply.authorId
                },
                postTitle: '',
                postDate: reply.postDate,
                text: reply.text,
                attachment: reply.attachment,
                onReplyClick: () => {
                    window.location.href = `/replies/${reply.id}?postId=${this.postId}`;
                }
            });
            
            replyInstance.render().then(el => {
                wrapper.appendChild(el);
                repliesList.appendChild(wrapper);
            }).catch(err => {
                console.error('Render error:', err);
            });
        }
    }

    destroy(): void {
        commentsStore.removeListener(this.boundCommentsStoreHandler);
        userListStore.removeListener(this.boundUserListStoreHandler);
        
        if (this.rootElement && this.rootElement.parentNode === this.container) {
            this.container.removeChild(this.rootElement);
        }
        
        this.rootElement = null;
        this.rightMenu = null;
    }
}