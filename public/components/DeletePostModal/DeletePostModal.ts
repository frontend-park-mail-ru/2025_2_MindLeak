let deletePostModalTemplate: Handlebars.TemplateDelegate | null = null;

interface DeletePostModalProps {
    isLoading?: boolean;
}

async function getDeletePostModalTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (deletePostModalTemplate) return deletePostModalTemplate;

    const res = await fetch('/components/DeletePostModal/DeletePostModal.hbs');
    const source = await res.text();
    deletePostModalTemplate = Handlebars.compile(source);
    return deletePostModalTemplate;
}

export class DeletePostModal {
    private props: DeletePostModalProps;
    private element: HTMLElement | null = null;
    private resolvePromise: ((result: boolean) => void) | null = null;
    private promise: Promise<boolean>;

    constructor(props: DeletePostModalProps = {}) {
        this.props = props;
        this.promise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    async render(): Promise<HTMLElement> {
        const template = await getDeletePostModalTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        this.element = div.firstElementChild as HTMLElement;
        
        if (!this.element) {
            throw new Error('DeletePostModal element not found');
        }

        this.setupEventListeners();
        return this.element;
    }

    private setupEventListeners(): void {
        if (!this.element) return;

        // Закрытие при клике на фон
        this.element.addEventListener('click', (e: Event) => {
            if (e.target === this.element) {
                this.close(false);
            }
        });

        const cancelButton = this.element.querySelector('.delete-post-modal__cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.close(false);
            });
        }

        const deleteButton = this.element.querySelector('.delete-post-modal__delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.handleDelete();
            });
        }

        // Обработка клавиши Escape
        document.addEventListener('keydown', this.handleKeyDown);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            this.close(false);
        }
    };

    private close(result: boolean): void {
        if (this.resolvePromise) {
            this.resolvePromise(result);
        }
        this.destroy();
    }

    private handleDelete(): void {
        const deleteButton = this.element?.querySelector('.delete-post-modal__delete') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent = 'Удаление...';
        }

        // Закрываем с результатом true (подтверждение удаления)
        this.close(true);
    }

    // Метод для ожидания результата
    async waitForResult(): Promise<boolean> {
        return this.promise;
    }

    destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}