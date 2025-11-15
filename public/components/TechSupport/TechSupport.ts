// components/TechSupport/TechSupportIframe.ts
interface SupportFormData {
    accountEmail: string;
    topic: string;
    description: string;
    contactName: string;
    contactEmail: string;
    attachment?: File;
}

interface FormError {
    field: string;
    message: string;
}

class TechSupportIframe {
    private userEmail: string = '';
    private form: HTMLFormElement | null = null;
    private template: Handlebars.TemplateDelegate | null = null;

    constructor() {
        this.init();
    }

    async init(): Promise<void> {
        await this.loadTemplate();
        this.renderForm();
        
        window.addEventListener('message', this.handleParentMessage.bind(this));
        window.parent.postMessage({ type: 'IFRAME_READY', source: 'tech-support' }, '*');
    }

    async loadTemplate(): Promise<void> {
        try {
            const response = await fetch('/components/TechSupport/TechSupport.hbs');
            const templateSource = await response.text();
            this.template = Handlebars.compile(templateSource);
        } catch (error) {
            console.error('Failed to load template:', error);
        }
    }

    private handleParentMessage(event: MessageEvent): void {
        if (event.origin !== window.location.origin) return;
        
        const { type, payload } = event.data;
        
        switch (type) {
            case 'INIT_DATA':
                this.userEmail = payload.userEmail || 'email@example.com'; // fallback
                console.log('📧 Received user email:', this.userEmail); // debug
                this.renderForm();
                break;
            case 'TICKET_SUBMITTED':
                this.showSuccessMessage();
                break;
            case 'TICKET_ERROR':
                this.showError(payload.error);
                break;
        }
    }

    private renderForm(): void {
        console.log('🔄 Rendering form...');
        console.log('📧 User email:', this.userEmail);
        console.log('📋 Template available:', !!this.template);
        
        if (!this.template) {
            console.error('❌ Template not loaded');
            this.showError('Template not loaded');
            return;
        }
        
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl) {
            console.error('❌ Content element not found');
            return;
        }

        try {
            const html = this.template({ userEmail: this.userEmail });
            console.log('📝 Generated HTML length:', html.length);
            contentEl.innerHTML = html;
            
            this.form = document.getElementById('supportForm') as HTMLFormElement;
            if (this.form) {
                console.log('✅ Form found and setup');
                this.form.addEventListener('submit', this.handleSubmit.bind(this));
                this.setupFileUpload();
            } else {
                console.error('❌ Form element not found');
            }
        } catch (error) {
            console.error('❌ Error rendering template:', error);
        }
    }

    private setupFileUpload(): void {
        const fileInput = this.form?.querySelector('input[type="file"]') as HTMLInputElement;
        const filePreview = this.form?.querySelector('#filePreview') as HTMLElement;
        const fileUpload = this.form?.querySelector('#fileUpload') as HTMLElement;

        if (fileInput && filePreview && fileUpload) {
            fileInput.addEventListener('change', (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) this.validateAndPreviewFile(file, filePreview);
            });

            fileUpload.addEventListener('dragover', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.style.borderColor = 'var(--accent-color)';
            });

            fileUpload.addEventListener('dragleave', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.style.borderColor = 'var(--border-color)';
            });

            fileUpload.addEventListener('drop', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.style.borderColor = 'var(--border-color)';
                const files = e.dataTransfer?.files;
                if (files && files[0]) {
                    fileInput.files = files;
                    this.validateAndPreviewFile(files[0], filePreview);
                }
            });
        }
    }

    private validateAndPreviewFile(file: File, previewElement: HTMLElement): void {
        if (!file.type.startsWith('image/')) {
            this.showFieldError('attachment', 'Только изображения');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.showFieldError('attachment', 'Макс. размер: 5MB');
            return;
        }
        this.clearFieldError('attachment');
        
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target?.result) {
                previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
        };
        reader.readAsDataURL(file);
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (!this.form) return;

        const formData = new FormData(this.form);
        const data: SupportFormData = {
            accountEmail: formData.get('accountEmail') as string,
            topic: formData.get('topic') as string,
            description: formData.get('description') as string,
            contactName: formData.get('contactName') as string,
            contactEmail: formData.get('contactEmail') as string,
            attachment: formData.get('attachment') as File
        };

        const errors = this.validateForm(data);
        if (errors.length > 0) {
            this.showFieldErrors(errors);
            return;
        }

        this.clearErrors();
        this.setLoading(true);

        try {
            window.parent.postMessage({ 
                type: 'SUPPORT_TICKET_SUBMIT', 
                payload: data 
            }, '*');
        } catch (error) {
            this.showError('Ошибка отправки');
            this.setLoading(false);
        }
    }

    private validateForm(data: SupportFormData): FormError[] {
        const errors: FormError[] = [];
        
        if (!data.topic) {
            errors.push({ field: 'topic', message: 'Выберите тему' });
        }
        
        if (!data.description || data.description.trim().length < 10) {
            errors.push({ field: 'description', message: 'Не менее 10 символов' });
        }
        
        if (!data.contactName) {
            errors.push({ field: 'contactName', message: 'Укажите имя' });
        }
        
        if (!data.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
            errors.push({ field: 'contactEmail', message: 'Некорректный email' });
        }
        
        return errors;
    }

    private showFieldErrors(errors: FormError[]): void {
        errors.forEach(({ field, message }) => this.showFieldError(field, message));
    }

    private showFieldError(field: string, message: string): void {
        const input = this.form?.querySelector(`[name="${field}"]`) as HTMLInputElement;
        if (input) {
            input.classList.add('error');
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.textContent = message;
            input.parentNode?.appendChild(errorEl);
        }
    }

    private clearFieldError(field: string): void {
        const input = this.form?.querySelector(`[name="${field}"]`) as HTMLInputElement;
        if (input) {
            input.classList.remove('error');
            const existingError = input.parentNode?.querySelector('.field-error');
            if (existingError) existingError.remove();
        }
    }

    private clearErrors(): void {
        this.form?.querySelectorAll('.error').forEach(input => {
            input.classList.remove('error');
        });
        this.form?.querySelectorAll('.field-error, .global-error').forEach(el => {
            el.remove();
        });
    }

    private setLoading(isLoading: boolean): void {
        const button = this.form?.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (button) {
            button.disabled = isLoading;
            button.textContent = isLoading ? 'Отправка...' : 'Отправить обращение';
        }
    }

    private showSuccessMessage(): void {
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div class="tech-support-modal">
                <div class="success-message">
                    <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                    <h2 style="margin-bottom: 16px;">Обращение отправлено</h2>
                    <p style="color: var(--text-lighter); margin-bottom: 24px;">
                        Ваше обращение успешно отправлено.<br>
                        Мы ответим вам в ближайшее время.
                    </p>
                    <button type="button" class="form__button" onclick="location.reload()">
                        Новое обращение
                    </button>
                </div>
            </div>
        `;
    }

    private showError(message: string): void {
        this.setLoading(false);
        const errorEl = document.createElement('div');
        errorEl.className = 'global-error';
        errorEl.textContent = message;
        this.form?.appendChild(errorEl);
    }
}

// Инициализация когда DOM готов
document.addEventListener('DOMContentLoaded', () => {
    new TechSupportIframe();
});