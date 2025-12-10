let deleteModalTemplate: Handlebars.TemplateDelegate | null = null;

interface DeleteModalProps {
    // Конфигурация текста
    title: string;
    message: string;
    cancelText?: string;
    deleteText?: string;
    deleteLoadingText?: string;
    
    // Состояние
    isLoading?: boolean;
    
    // Колбэки
    onCancel?: () => void;
    onDelete?: () => void;
    
    // Автоматическое закрытие после удаления
    autoCloseOnDelete?: boolean;
}

async function getDeleteModalTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (deleteModalTemplate) return deleteModalTemplate;

    const res = await fetch('/components/DeleteModal/DeleteModal.hbs');
    const source = await res.text();
    deleteModalTemplate = Handlebars.compile(source);
    return deleteModalTemplate;
}

export class DeleteModal {
    private props: DeleteModalProps;
    private element: HTMLElement | null = null;
    private resolvePromise: ((result: boolean) => void) | null = null;
    private promise: Promise<boolean>;

    constructor(props: DeleteModalProps) {
        this.props = {
            cancelText: 'Отмена',
            deleteText: 'Удалить',
            deleteLoadingText: 'Удаление...',
            autoCloseOnDelete: true,
            ...props
        };
        
        this.promise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    async render(): Promise<HTMLElement> {
        const template = await getDeleteModalTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        this.element = div.firstElementChild as HTMLElement;
        
        if (!this.element) {
            throw new Error('DeleteModal element not found');
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

        const cancelButton = this.element.querySelector('.delete-modal__cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.close(false);
            });
        }

        const deleteButton = this.element.querySelector('.delete-modal__delete');
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
        
        // Вызываем колбэки
        if (!result && this.props.onCancel) {
            this.props.onCancel();
        }
        
        this.destroy();
    }

    private async handleDelete(): Promise<void> {
        const deleteButton = this.element?.querySelector('.delete-modal__delete') as HTMLButtonElement;
        
        // Блокируем кнопку и показываем состояние загрузки
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent = this.props.deleteLoadingText;
        }

        try {
            // Вызываем пользовательский обработчик
            if (this.props.onDelete) {
                await this.props.onDelete();
            }
            
            // Закрываем с результатом true
            if (this.props.autoCloseOnDelete) {
                this.close(true);
            }
        } catch (error) {
            // В случае ошибки разблокируем кнопку
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.textContent = this.props.deleteText;
            }
        }
    }

    // Метод для ожидания результата
    async waitForResult(): Promise<boolean> {
        return this.promise;
    }

    // Метод для обновления пропсов
    updateProps(newProps: Partial<DeleteModalProps>): void {
        this.props = { ...this.props, ...newProps };
        // Здесь можно добавить перерисовку если нужно
    }

    destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}