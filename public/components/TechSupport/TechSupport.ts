// components/TechSupport/TechSupportIframe.ts

interface SupportFormData {
    email_registered: string;
    category_id: string;
    problem_description: string;
    name: string;
    email_for_connection: string;
    attachment?: File;
}

interface Appeal {
    id: string;
    email_registered: string;
    status: 'created' | 'in_work' | 'solved';
    problem_description: string;
    name: string;
    category_id: string;
    emailForConnect: string;
    screenshot_url?: string;
    createdAt?: string;
}

interface FormError {
    field: string;
    message: string;
}

interface UserData {
    userEmail: string;
    userName: string;
    userContactEmail?: string;
}

class TechSupportIframe {
    private userData: UserData = {
        userEmail: '',
        userName: '',
        userContactEmail: ''
    };
    private form: HTMLFormElement | null = null;
    private template: Handlebars.TemplateDelegate | null = null;
    private historyTemplate: Handlebars.TemplateDelegate | null = null;
    private currentFile: File | null = null;
    private appeals: Appeal[] = [];
    private isSubmitting: boolean = false;

    constructor() {
        this.init();
    }

    async init(): Promise<void> {
        await this.loadTemplates();
        this.renderForm();
        
        window.addEventListener('message', this.handleParentMessage.bind(this));
        window.parent.postMessage({ type: 'IFRAME_READY', source: 'tech-support' }, '*');
        
        // Загружаем историю обращений при инициализации
        this.loadAppealsHistory();
    }

    async loadTemplates(): Promise<void> {
        try {
            const response = await fetch('/components/TechSupport/TechSupport.hbs');
            const templateSource = await response.text();
            this.template = Handlebars.compile(templateSource);

            const historyResponse = await fetch('/components/TechSupport/TechSupportHistory.hbs');
            const historyTemplateSource = await historyResponse.text();
            this.historyTemplate = Handlebars.compile(historyTemplateSource);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    private handleParentMessage(event: MessageEvent): void {
        if (event.origin !== window.location.origin) return;
        
        const { type, payload } = event.data;
        
        switch (type) {
            case 'INIT_DATA':
                this.userData = {
                    userEmail: payload.userEmail || '',
                    userName: payload.userName || '',
                    userContactEmail: payload.userContactEmail || payload.userEmail || ''
                };
                
                console.log('📧 Received user data:', this.userData);
                
                this.renderForm();
                break;
            case 'TICKET_SUBMITTED':
                this.showSuccessMessage();
                break;
            case 'TICKET_ERROR':
                this.showError(payload.error);
                break;
            case 'APPEALS_LOAD_SUCCESS':
                // Получаем обращения из API
                this.appeals = payload.appeals || [];
                console.log('📋 Loaded appeals:', this.appeals);
                break;
            case 'APPEALS_LOAD_FAIL':
                console.error('Failed to load appeals:', payload.error);
                break;
            case 'SUPPORT_TICKET_SUBMIT_SUCCESS':
                // Обращение успешно отправлено, показываем историю
                this.showSuccessAndHistory();
                break;
            case 'SUPPORT_TICKET_SUBMIT_FAIL':
                this.showError(payload.error);
                this.setLoading(false);
                this.isSubmitting = false;
                break;
        }
    }

private autoFillForm(): void {
    if (!this.form) return;

    const accountEmailInput = this.form.querySelector('[name="email_registered"]') as HTMLInputElement;
    const contactNameInput = this.form.querySelector('[name="name"]') as HTMLInputElement;
    const contactEmailInput = this.form.querySelector('[name="email_for_connection"]') as HTMLInputElement;

    if (accountEmailInput) {
        accountEmailInput.value = this.userData.userEmail;
    }
    
    if (contactNameInput) {
        contactNameInput.value = this.userData.userName;
    }
    
    if (contactEmailInput) {
        const emailToUse = this.userData.userContactEmail || this.userData.userEmail;
        contactEmailInput.value = emailToUse;
    }
}

    private renderForm(): void {
        console.log('🔄 Rendering form...');
        
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
            const html = this.template({ 
                userEmail: this.userData.userEmail 
            });
            contentEl.innerHTML = html;
            
            this.form = document.getElementById('supportForm') as HTMLFormElement;
            if (this.form) {
                console.log('✅ Form found and setup');
                this.form.addEventListener('submit', this.handleSubmit.bind(this));
                this.setupFileUpload();
                this.autoFillForm();
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
        const fileLabel = this.form?.querySelector('.file-upload__label') as HTMLElement;

        if (fileInput && filePreview && fileUpload && fileLabel) {
            fileInput.addEventListener('change', (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) this.handleFileSelect(file, filePreview, fileLabel);
            });

            fileUpload.addEventListener('dragover', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.add('drag-over');
            });

            fileUpload.addEventListener('dragleave', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.remove('drag-over');
            });

            fileUpload.addEventListener('drop', (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.remove('drag-over');
                
                const files = e.dataTransfer?.files;
                if (files && files[0]) {
                    fileInput.files = files;
                    this.handleFileSelect(files[0], filePreview, fileLabel);
                }
            });

            fileUpload.addEventListener('click', (e: Event) => {
                if (e.target !== fileInput && !(e.target as Element).closest('.file-remove-btn')) {
                    fileInput.click();
                }
            });

            document.addEventListener('paste', (e: ClipboardEvent) => {
                const items = e.clipboardData?.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                            const file = items[i].getAsFile();
                            if (file) {
                                fileInput.files = this.createFileList(file);
                                this.handleFileSelect(file, filePreview, fileLabel);
                                break;
                            }
                        }
                    }
                }
            });
        }
    }

    private createFileList(file: File): FileList {
        const dt = new DataTransfer();
        dt.items.add(file);
        return dt.files;
    }

    private handleFileSelect(file: File, previewElement: HTMLElement, labelElement: HTMLElement): void {
        if (!file.type.startsWith('image/')) {
            this.showFieldError('attachment', 'Только изображения (JPEG, PNG, GIF)');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showFieldError('attachment', 'Макс. размер: 5MB');
            return;
        }
        
        this.clearFieldError('attachment');
        this.currentFile = file;
        
        labelElement.textContent = `📎 ${file.name} (${this.formatFileSize(file.size)})`;
        
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target?.result) {
                previewElement.innerHTML = `
                    <div class="file-preview-container">
                        <img src="${e.target.result}" alt="Preview" class="file-preview-image">
                        <button type="button" class="file-remove-btn" title="Удалить файл">×</button>
                    </div>
                `;
                
                const removeBtn = previewElement.querySelector('.file-remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.removeFile(previewElement, labelElement);
                    });
                }
            }
        };
        reader.readAsDataURL(file);
    }

    private removeFile(previewElement: HTMLElement, labelElement: HTMLElement): void {
        const fileInput = this.form?.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
        previewElement.innerHTML = '';
        labelElement.textContent = '📎 Выберите файл или перетащите сюда (макс. 5MB)';
        this.clearFieldError('attachment');
        this.currentFile = null;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔄 Form submission started');
        
        if (!this.form || this.isSubmitting) {
            console.log('❌ Form not ready or already submitting');
            return;
        }

        const formData = new FormData(this.form);
        const data: SupportFormData = {
            email_registered: formData.get('email_registered') as string,
            category_id: formData.get('category_id') as string,
            problem_description: formData.get('problem_description') as string,
            name: formData.get('name') as string,
            email_for_connection: formData.get('email_for_connection') as string,
            attachment: this.currentFile || undefined
        };

        console.log('📝 Form data prepared:', data);

        const errors = this.validateForm(data);
        if (errors.length > 0) {
            console.log('❌ Form validation errors:', errors);
            this.showFieldErrors(errors);
            return;
        }

        console.log('✅ Form validation passed, sending to parent...');
        
        this.clearErrors();
        this.setLoading(true);
        this.isSubmitting = true;

        try {
            window.parent.postMessage({ 
                type: 'SUPPORT_TICKET_SUBMIT_REQUEST', 
                payload: data,
                source: 'tech-support'
            }, '*');
            
            console.log('📤 Message sent to parent window:', { 
                type: 'SUPPORT_TICKET_SUBMIT_REQUEST', 
                payload: data,
                source: 'tech-support'
            });
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showError('Ошибка отправки: ' + (error as Error).message);
            this.setLoading(false);
            this.isSubmitting = false;
        }
    }

    private loadAppealsHistory(): void {
        // Запрашиваем загрузку обращений через API
        window.parent.postMessage({ 
            type: 'APPEALS_LOAD_REQUEST' 
        }, '*');
    }

    private showSuccessAndHistory(): void {
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl || !this.historyTemplate) return;

        const appealsWithFormattedData = this.appeals.map(appeal => ({
            ...appeal,
            statusColor: this.getStatusColor(appeal.status),
            statusText: this.getStatusText(appeal.status),
            categoryName: this.getCategoryName(appeal.category_id),
            formattedDate: new Date(appeal.createdAt || '').toLocaleDateString('ru-RU')
        }));

        const html = this.historyTemplate({
            appeals: appealsWithFormattedData,
            hasAppeals: this.appeals.length > 0
        });
        
        contentEl.innerHTML = html;
    }

    private getStatusColor(status: string): string {
        switch (status) {
            case 'created': return '#0E7AF6';
            case 'in_work': return '#FFA500';
            case 'solved': return '#4CAF50';
            default: return '#6B6B6B';
        }
    }

    private getStatusText(status: string): string {
        switch (status) {
            case 'created': return 'Отправлен';
            case 'in_work': return 'В работе';
            case 'solved': return 'Решен';
            default: return status;
        }
    }

    private getCategoryName(categoryID: string): string {
        const categories: { [key: string]: string } = {
            '1': 'Баг или техническая проблема',
            '2': 'Проблема с аккаунтом/авторизацией',
            '3': 'Предложение по функционалу',
            '4': 'Вопрос по использованию сервиса',
            '5': 'Жалоба или обратная связь',
            '6': 'Другое'
        };
        return categories[categoryID] || 'Другое';
    }

    private validateForm(data: SupportFormData): FormError[] {
        const errors: FormError[] = [];
        
        if (!data.category_id) {
            errors.push({ field: 'category_id', message: 'Выберите тему' });
        }
        
        if (!data.problem_description || data.problem_description.trim().length < 10) {
            errors.push({ field: 'problem_description', message: 'Не менее 10 символов' });
        }
        
        if (!data.name) {
            errors.push({ field: 'name', message: 'Укажите имя' });
        }
        
        if (!data.email_for_connection || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_for_connection)) {
            errors.push({ field: 'email_for_connection', message: 'Некорректный email' });
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

document.addEventListener('DOMContentLoaded', () => {
    new TechSupportIframe();
});