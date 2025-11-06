export class PostCardMenu {
    private element: HTMLElement;
    private menuButton: HTMLElement;
    private isOpen = false;

    constructor(menuButton: HTMLElement, menuElement: HTMLElement) {
        this.menuButton = menuButton;
        this.element = menuElement;

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
            });
        });
    }

    private handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!this.element.contains(target) && !this.menuButton.contains(target)) {
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

        // Небольшая задержка, чтобы обработчик не сработал на том же клике
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
        }, 10);
    }

    close() {
        if (!this.isOpen) return;

        this.element.classList.remove('post-card-menu--open');
        this.isOpen = false;

        document.removeEventListener('click', this.handleClickOutside);
    }
}