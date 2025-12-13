import { router } from '../../router/router';
import { loginStore } from '../../stores/storeLogin';
import { LoginFormView } from '../../views/viewLogin';
import { dispatcher } from '../../dispatcher/dispatcher';

let commentTemplate: Handlebars.TemplateDelegate | null = null;

export interface CommentAuthor {
    name: string;
    subtitle: string;
    avatar: string | null;
    isSubscribed: boolean;
    id?: string;
}

export interface CommentAttachment {
    image?: string;
    file?: string;
    fileName?: string;
}

export interface CommentProps {
    commentId: string;
    postId: string;
    user: CommentAuthor;
    postTitle: string;
    postDate: string;
    text: string;
    attachment?: CommentAttachment;
    onReplyClick?: (commentId: string) => void;
    hideSubscribeButton?: boolean;
}

async function getCommentTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (commentTemplate) return commentTemplate;

    const partials = [
        { name: 'user-menu', path: '/components/UserMenu/UserMenu.hbs' },
        { name: 'icon', path: '/components/Icon/Icon.hbs' }
    ];

    await Promise.all(
        partials.map(async (p) => {
            if (!Handlebars.partials[p.name]) {
                const res = await fetch(p.path);
                const src = await res.text();
                Handlebars.registerPartial(p.name, Handlebars.compile(src));
            }
        })
    );

    const res = await fetch('/components/Comment/Comment.hbs');
    const source = await res.text();
    commentTemplate = Handlebars.compile(source);
    return commentTemplate;
}

export class Comment {
    private commentId: string;
    private postId: string;
    private user: CommentAuthor;
    private postTitle: string;
    private postDate: string;
    private text: string;
    private attachment?: CommentAttachment;
    private onReplyClick?: (commentId: string) => void;
    private hideSubscribeButton: boolean;

    constructor(props: CommentProps) {
        this.commentId = props.commentId;
        this.postId = props.postId;
        this.user = props.user;
        this.postTitle = props.postTitle;
        this.postDate = props.postDate;
        this.text = props.text;
        this.attachment = props.attachment;
        this.onReplyClick = props.onReplyClick;
        this.hideSubscribeButton = props.hideSubscribeButton || false;
    }

    async render(): Promise<HTMLElement> {
        const template = await getCommentTemplate();
        const html = template({
            commentId: this.commentId,
            user: this.user,
            postTitle: this.postTitle,
            postDate: this.postDate,
            text: this.text,
            attachment: this.attachment,
            hideSubscribeButton: this.hideSubscribeButton,
        });

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        const commentEl = div.firstElementChild as HTMLElement;

        if (!commentEl) {
            throw new Error('Comment element not found');
        }

        this.setupAuthorClickHandlers(commentEl);
        this.setupReplyHandler(commentEl);
        this.setupReplyInput(commentEl);

        return commentEl;
    }

    private setupAuthorClickHandlers(commentEl: HTMLElement): void {
        const authorBlocks = [
            commentEl.querySelector('.user-menu__avatar'),
            commentEl.querySelector('.user-menu__name'),
            commentEl.querySelector('.user-menu__subtitle'),
            commentEl.querySelector('.user-menu')
        ].filter(Boolean) as HTMLElement[];

        const subscribeButton = commentEl.querySelector('.user-menu__button') as HTMLElement | null;

        const navigateToProfile = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            const authState = loginStore.getState();
            const authorId = this.user.id;

            if (!authorId) return;

            const targetUrl = `/profile?id=${authorId}`;

            if (!authState.isLoggedIn) {
                const loginView = new LoginFormView(targetUrl);
                loginView.render().then(modal => document.body.appendChild(modal));
            } else {
                router.navigate(targetUrl);
            }
        };

        authorBlocks.forEach(block => {
            if (block === subscribeButton?.parentNode || block === subscribeButton) return;
            block.style.cursor = 'pointer';
            block.addEventListener('click', (e) => {
                if (subscribeButton && subscribeButton.contains(e.target as Node)) return;
                navigateToProfile(e);
            });
        });

        if (subscribeButton) {
            // 🔥 ДОБАВЬТЕ ЭТОТ ОБРАБОТЧИК
            subscribeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const authorId = this.user.id;
                if (!authorId) return;
                
                this.handleSubscribeAction(subscribeButton, authorId.toString());
            });
        }
    }

    private handleSubscribeAction(button: HTMLElement, userId: string): void {
        console.log('🔍 [Comment] handleSubscribeAction:', {
            userId: userId,
            buttonClass: button.className,
            hideSubscribeButton: this.hideSubscribeButton
        });
        
        // Если это собственный комментарий, ничего не делаем
        if (this.hideSubscribeButton) {
            console.log('⚠️ [Comment] Own comment, skipping subscription');
            return;
        }
        
        const isSubscribed = button.classList.contains('user-menu__button--subscribed');
        
        console.log('🔍 [Comment] Current subscription state:', isSubscribed);
        
        if (isSubscribed) {
            // Отписка
            dispatcher.dispatch('UNSUBSCRIBE_REQUEST', { 
                userId: userId,
                targetProfileId: userId
            });
            
            // Сразу обновляем UI
            button.classList.remove('user-menu__button--subscribed');
            button.classList.add('user-menu__button--subscribe');
            button.textContent = 'Подписаться';
        } else {
            // Подписка
            dispatcher.dispatch('SUBSCRIBE_REQUEST', { 
                userId: userId,
                targetProfileId: userId
            });
            
            // Сразу обновляем UI
            button.classList.remove('user-menu__button--subscribe');
            button.classList.add('user-menu__button--subscribed');
            button.textContent = 'Отписаться';
        }
    }

    private setupReplyHandler(commentEl: HTMLElement): void {
        const replyBtn = commentEl.querySelector('[data-key="show-replies"]') as HTMLElement | null;
        if (!replyBtn) return;

        replyBtn.style.cursor = 'pointer';

        replyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // @ts-ignore – если onReplyClick нет в типах, TS не ругается
            if (typeof (this as any).onReplyClick === 'function') {
                return (this as any).onReplyClick(this.commentId);
            }

            window.location.href = `/replies/${this.commentId}?postId=${this.postId}`;
        });
    }

    private setupReplyInput(commentEl: HTMLElement): void {
        const input = commentEl.querySelector('[data-key="reply-input"]') as HTMLInputElement | null;
        const button = commentEl.querySelector('[data-key="reply-submit"]') as HTMLButtonElement | null;

        if (!input || !button) return;

        const update = () => {
            button.disabled = input.value.trim().length === 0;
        };

        input.addEventListener('input', update);
        update();

        button.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;

            const auth = loginStore.getState();
            if (!auth.isLoggedIn) {
                const loginView = new LoginFormView(window.location.pathname + window.location.search);
                loginView.render().then(modal => document.body.appendChild(modal));
                return;
            }

            // определяем, является ли это ответом на комментарий или на пост
            const isRootInput = !this.text; // Если this.text пустой - это форма ответа на пост

            if (isRootInput) {
                // Ответ на пост - остаёмся здесь и перезагружаем
                dispatcher.dispatch('COMMENT_CREATE_REQUEST', {
                    postId: this.postId,
                    text
                });
            } else {
                // Ответ на комментарий - переходим к просмотру ответов
                dispatcher.dispatch('REPLY_CREATE_REQUEST', {
                    commentId: this.commentId,
                    postId: this.postId,
                    text,
                    shouldNavigate: true // ⚠️ ДОБАВЛЯЕМ ФЛАГ ДЛЯ ПЕРЕХОДА
                });
            }

            input.value = '';
            update();
        });
    }

}