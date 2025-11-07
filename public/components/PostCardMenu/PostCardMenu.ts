import { dispatcher } from '../../dispatcher/dispatcher';
import { CreatePostFormView } from '../../views/viewCreatePostForm';

export class PostCardMenu {
    private element: HTMLElement;
    private menuButton: HTMLElement;
    private isOpen = false;
    private postId: string;

    constructor(menuButton: HTMLElement, menuElement: HTMLElement, postId: string) {
        this.menuButton = menuButton;
        this.element = menuElement;
        this.postId = postId;

        this.init();
    }

    private init() {
        this.menuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        this.element.querySelectorAll('[data-key]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const key = item.getAttribute('data-key');
                this.handleMenuItemClick(key);
                this.close();
            });
        });
    }

    private handleMenuItemClick(key: string | null) {
        switch (key) {
            case 'edit':
                this.handleEdit();
                break;
            case 'delete':
                this.handleDelete();
                break;
            // ... другие обработчики
        }
    }

    private handleEdit() {
        console.log('[PostCardMenu] Редактирование поста:', this.postId);
        // Отправляем запрос на загрузку данных поста для редактирования
        dispatcher.dispatch('POST_EDIT_REQUEST', { postId: this.postId });
        
        // Открываем форму редактирования
        this.openEditPostForm();
    }

    private async openEditPostForm(): Promise<void> {
        const createPostForm = new CreatePostFormView();
        const formElement = await createPostForm.render();
        document.body.appendChild(formElement);
    }

    private handleDelete() {
        // ... существующий код для удаления
    }

    private handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!this.element.contains(target) && !this.menuButton.contains(target)) {
            this.close();
        }
    };

    private handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            this.close();
        }
    };

    private toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;

        document.querySelectorAll('.post-card-menu').forEach(el => {
            if (el !== this.element) {
                el.classList.remove('post-card-menu--open');
            }
        });

        this.element.classList.add('post-card-menu--open');
        this.isOpen = true;

        document.addEventListener('click', this.handleClickOutside);
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    close() {
        if (!this.isOpen) return;

        this.element.classList.remove('post-card-menu--open');
        this.isOpen = false;

        document.removeEventListener('click', this.handleClickOutside);
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
}