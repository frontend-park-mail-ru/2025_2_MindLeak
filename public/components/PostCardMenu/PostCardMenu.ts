import { dispatcher } from '../../dispatcher/dispatcher';
import { CreatePostFormView } from '../../views/viewCreatePostForm';
import { DeletePostModal } from '../DeletePostModal/DeletePostModal';

export class PostCardMenu {
    private element: HTMLElement;
    private menuButton: HTMLElement;
    private isOpen = false;
    private postId: string;
    private onMenuItemClick?: (key: string, postId: string) => void;
    private isInitialized = false;

    constructor(menuButton: HTMLElement, menuElement: HTMLElement, postId: string, onMenuItemClick?: (key: string, postId: string) => void) {
        // Проверяем, не инициализирован ли уже этот элемент
        if (menuButton.hasAttribute('data-postcard-menu-initialized')) {
            // НО ДАЕМ ВОЗМОЖНОСТЬ ПЕРЕИНИЦИАЛИЗАЦИИ ДЛЯ НОВОГО РЕДАКТИРОВАНИЯ
            this.menuButton = menuButton;
            this.element = menuElement;
            this.postId = postId;
            this.onMenuItemClick = onMenuItemClick;
            this.init();
            return;
        }

        this.menuButton = menuButton;
        this.element = menuElement;
        this.postId = postId;
        this.onMenuItemClick = onMenuItemClick;

        this.init();
    }

    private init() {
        if (this.isInitialized) {
            return;
        }

        // Помечаем элемент как инициализированный
        this.menuButton.setAttribute('data-postcard-menu-initialized', 'true');
        this.isInitialized = true;

        this.menuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        this.element.querySelectorAll('[data-key]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const key = item.getAttribute('data-key');
                await this.handleMenuItemClick(key);
                this.close();
            });
        });

    }

    private async handleMenuItemClick(key: string | null) {
        if (!key) return;
        
        // Для действия "delete" всегда показываем модалку подтверждения
        if (key === 'delete') {
            await this.handleDelete();
            return;
        }
        
        // ПЕРЕД редактированием сбрасываем возможные предыдущие состояния
        if (key === 'edit') {
            // Сбрасываем состояние формы перед новым редактированием
            dispatcher.dispatch('CREATE_POST_FORM_INIT');
        }
        
        // Для остальных действий вызываем колбэк
        if (this.onMenuItemClick) {
            this.onMenuItemClick(key, this.postId);
        } else {
            // Фолбэк на случай если колбэк не передан
            switch (key) {
                case 'edit':
                    this.handleEdit();
                    break;
                case 'hide':
                case 'report':
                    // Эти действия можно передавать через колбэк
                    break;
            }
        }
    }

    private handleEdit() {
        // ТОЛЬКО отправляем запрос на загрузку данных поста
        dispatcher.dispatch('POST_EDIT_REQUEST', { postId: this.postId });
        // НЕ открываем форму здесь - это сделает store
    }

    private async handleDelete(): Promise<void> {
        
        // Создаем и показываем модалку подтверждения
        const deleteModal = new DeletePostModal();
        const modalElement = await deleteModal.render();
        document.body.appendChild(modalElement);

        // Ждем результата от пользователя
        const confirmed = await deleteModal.waitForResult();
        
        if (confirmed) {
            // Отправляем запрос на удаление поста
            dispatcher.dispatch('POST_DELETE_REQUEST', { postId: this.postId });

            setTimeout(() => {
                dispatcher.dispatch('PROFILE_RELOAD_AFTER_DELETE');
            }, 1000); // Задержка чтобы API успел обработать удаление
        } else {
        }
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