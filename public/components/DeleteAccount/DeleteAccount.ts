let deleteAccountModalTemplate: Handlebars.TemplateDelegate | null = null;

interface DeleteAccountModalProps {
    isLoading?: boolean;
}

async function getDeleteAccountModalTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (deleteAccountModalTemplate) return deleteAccountModalTemplate;

    const res = await fetch('/components/DeleteAccount/DeleteAccount.hbs');
    const source = await res.text();
    deleteAccountModalTemplate = Handlebars.compile(source);
    return deleteAccountModalTemplate;
}

export class DeleteAccountModal {
    private props: DeleteAccountModalProps;
    private element: HTMLElement | null = null;

    constructor(props: DeleteAccountModalProps = {}) {
        this.props = props;
    }

    async render(): Promise<HTMLElement> {
        const template = await getDeleteAccountModalTemplate();
        const html = template(this.props);

        const div = document.createElement('div');
        div.innerHTML = html.trim();
        this.element = div.firstElementChild as HTMLElement;
        
        if (!this.element) {
            throw new Error('DeleteAccountModal element not found');
        }

        this.setupEventListeners();
        return this.element;
    }

    private setupEventListeners(): void {
        if (!this.element) return;

        // Закрытие при клике на фон
        this.element.addEventListener('click', (e: Event) => {
            if (e.target === this.element) {
                this.close();
            }
        });

        const cancelButton = this.element.querySelector('.delete-account-modal__cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.close();
            });
        }

        const deleteButton = this.element.querySelector('.delete-account-modal__delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.handleDelete();
            });
        }
    }

    private close(): void {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }

    private handleDelete(): void {
        const deleteButton = this.element?.querySelector('.delete-account-modal__delete') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent = 'Удаление...';
        }

        const event = new CustomEvent('accountDeleteRequest');
        this.element?.dispatchEvent(event);
    }

    destroy(): void {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}
