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

    constructor(container: HTMLElement, postId: string) {
        this.container = container;
        this.postId = postId;
        this.boundStoreHandler = this.handleStoreChange.bind(this);
    }

    async init(): Promise<void> {
        this.container.appendChild(document.createElement('div'));
        commentsStore.addListener(this.boundStoreHandler);
        dispatcher.dispatch('COMMENTS_LOAD_REQUEST', { postId: this.postId });

        this.container.appendChild(document.createElement('div'));
    }

    private handleStoreChange(): void {
        const state = commentsStore.getState();
        const commentListEl = this.container.children[0] as HTMLElement;

        if (state.isLoading) {
            commentListEl.innerHTML = '<div class="comments-loader">Загрузка комментариев...</div>';
            return;
        }

        if (state.error) {
            commentListEl.innerHTML = `<div class="comments-error">${state.error}</div>`;
            return;
        }

        commentListEl.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'comment-wrapper';
        commentListEl.appendChild(wrapper);

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
            hideSubscribeButton: true // Скрываем кнопку подписки для заглушки
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
                        dispatcher.dispatch('COMMENT_CREATE_REQUEST', { postId: this.postId, text });
                        replyInput.value = '';
                        replySubmit.disabled = true;
                    }
                });
            }
        });

        // Рендер обычных комментариев
        for (const comment of state.comments) {
            const wrapper = document.createElement('div');
            wrapper.className = 'comment-wrapper';
            commentListEl.appendChild(wrapper);

            // Проверяем, является ли автор комментария текущим пользователем
            const isOwnComment = comment.authorId === userId;
            
            const isSubscribed = subscriptionsStore.isSubscribed(comment.authorId.toString());

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
                hideSubscribeButton: isOwnComment // Скрываем кнопку подписки для своих комментариев
            });

            commentInstance.render().then(el => {
                wrapper.appendChild(el);
            });
        }
    }

    destroy(): void {
        commentsStore.removeListener(this.boundStoreHandler);
    }
}