import { Comment } from '../components/Comment/Comment';
import { commentsStore } from '../stores/storeComments';
import { dispatcher } from '../dispatcher/dispatcher';
import { loginStore } from '../stores/storeLogin';
import { LoginFormView } from './viewLogin';
import { ReplyView } from './viewReply';
import { subscriptionsStore } from '../stores/storeSubscriptions';

export class CommentView {
    private container: HTMLElement;
    private postId: string;
    private boundStoreHandler: () => void;
    private isLoading: boolean = false; // Добавляем флаг загрузки

    constructor(container: HTMLElement, postId: string) {
        this.container = container;
        this.postId = postId;
        this.boundStoreHandler = this.handleStoreChange.bind(this);
    }

    async init(): Promise<void> {
        // Создаем контейнер для комментариев
        const commentListContainer = document.createElement('div');
        commentListContainer.id = 'comment-list-container';
        this.container.appendChild(commentListContainer);
        
        // Добавляем сообщение о загрузке
        commentListContainer.innerHTML = '<div class="comments-loader">Загрузка комментариев...</div>';
        
        commentsStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('COMMENTS_LOAD_REQUEST', { postId: this.postId });
    }

    private handleStoreChange(): void {
        const state = commentsStore.getState();
        const commentListContainer = document.getElementById('comment-list-container');
        
        if (!commentListContainer) return;

        if (state.isLoading) {
            commentListContainer.innerHTML = '<div class="comments-loader">Загрузка комментариев...</div>';
            this.isLoading = true;
            return;
        }

        if (state.error) {
            commentListContainer.innerHTML = `<div class="comments-error">${state.error}</div>`;
            this.isLoading = false;
            return;
        }

        // Если только что закончилась загрузка, рендерим комментарии
        if (this.isLoading || commentListContainer.innerHTML.includes('Отправка')) {
            this.renderComments(state, commentListContainer);
            this.isLoading = false;
        } else {
            // Обычный рендер при изменении состояния
            this.renderComments(state, commentListContainer);
        }
    }

    private renderComments(state: any, container: HTMLElement): void {
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'comment-wrapper';
        container.appendChild(wrapper);

        const authState = loginStore.getState();
        const userId = authState.user?.id;

        // Создаем заглушку для ввода нового комментария
        const emptyComment = new Comment({
            commentId: 'empty',
            postId: this.postId,
            user: {
                name: 'Вы',
                subtitle: '',
                avatar: loginStore.getState().user?.avatar || '/img/defaultAvatar.jpg',
                isSubscribed: true,
                id: userId
            },
            postTitle: '',
            postDate: '',
            text: '', 
            attachment: undefined,
            hideSubscribeButton: true
        });

        emptyComment.render().then(el => {
            wrapper.appendChild(el);

            // Подключаем обработчики к инпуту внутри заглушки
            const replyInput = el.querySelector('.comment__reply-input') as HTMLInputElement;
            const replySubmit = el.querySelector('.comment__reply-button') as HTMLButtonElement;

            if (replyInput && replySubmit) {
                const updateSubmitState = () => {
                    replySubmit.disabled = replyInput.value.trim().length === 0;
                };

                replyInput.addEventListener('input', updateSubmitState);
                replySubmit.addEventListener('click', () => {
                    const text = replyInput.value.trim();
                    if (text) {
                        const auth = loginStore.getState();
                        if (!auth.isLoggedIn) {
                            const loginView = new LoginFormView(`/post/${this.postId}`);
                            loginView.render().then(modal => document.body.appendChild(modal));
                            return;
                        }
                        
                        // Показываем сообщение о загрузке
                        container.innerHTML = '<div class="comments-loader">Отправка комментария...</div>';
                        this.isLoading = true;
                        
                        // Отправляем комментарий
                        dispatcher.dispatch('COMMENT_CREATE_REQUEST', { 
                            postId: this.postId, 
                            text 
                        });
                    }
                });
            }
        });

        // Рендер обычных комментариев
        for (const comment of state.comments) {
            const wrapper = document.createElement('div');
            wrapper.className = 'comment-wrapper';
            container.appendChild(wrapper);

            const isOwnComment = comment.authorId === userId;
            const isSubscribed = comment.isAuthorSubscribed || false;

            const commentInstance = new Comment({
                commentId: comment.id,
                postId: this.postId,
                user: {
                    name: comment.authorName,
                    subtitle: '',
                    avatar: comment.authorAvatar || '/img/defaultAvatar.jpg',
                    isSubscribed: isOwnComment ? false : isSubscribed,
                    id: comment.authorId
                },
                postTitle: '',
                postDate: '',
                text: comment.text,
                attachment: comment.attachment,
                hideSubscribeButton: isOwnComment
            });

            commentInstance.render().then(el => {
                wrapper.appendChild(el);
            });
        }
    }

    destroy(): void {
        commentsStore.removeListener(this.boundStoreHandler);
        // Удаляем контейнер
        const commentListContainer = document.getElementById('comment-list-container');
        if (commentListContainer && commentListContainer.parentNode === this.container) {
            this.container.removeChild(commentListContainer);
        }
    }
}