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
    private currentFile: File | null = null;

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
                // Получаем данные пользователя из профиля
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
        }
    }

    private autoFillForm(): void {
        if (!this.form) return;

        console.log('🔄 Auto-filling form with:', this.userData);

        // Автозаполнение полей
        const accountEmailInput = this.form.querySelector('[name="accountEmail"]') as HTMLInputElement;
        const contactNameInput = this.form.querySelector('[name="contactName"]') as HTMLInputElement;
        const contactEmailInput = this.form.querySelector('[name="contactEmail"]') as HTMLInputElement;

        if (accountEmailInput) {
            accountEmailInput.value = this.userData.userEmail;
            console.log('📧 Account email set to:', this.userData.userEmail);
        }
        
        if (contactNameInput) {
            contactNameInput.value = this.userData.userName;
            console.log('👤 Contact name set to:', this.userData.userName);
        }
        
        if (contactEmailInput) {
            // Используем userContactEmail если он есть, иначе основной email
            const emailToUse = this.userData.userContactEmail || this.userData.userEmail;
            contactEmailInput.value = emailToUse;
            console.log('📨 Contact email set to:', emailToUse);
        }

        console.log('✅ Form auto-filled with user data');
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
                this.autoFillForm(); // Автозаполнение после рендера
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
            // Обработчик выбора файла через кнопку
            fileInput.addEventListener('change', (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) this.handleFileSelect(file, filePreview, fileLabel);
            });

            // Drag & Drop функциональность
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

            // Клик по всей области загрузки
            fileUpload.addEventListener('click', (e: Event) => {
                if (e.target !== fileInput && !(e.target as Element).closest('.file-remove-btn')) {
                    fileInput.click();
                }
            });

            // Вставка из буфера обмена
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
        // Валидация файла
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
        
        // Обновляем текст лейбла
        labelElement.textContent = `📎 ${file.name} (${this.formatFileSize(file.size)})`;
        
        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (e.target?.result) {
                previewElement.innerHTML = `
                    <div class="file-preview-container">
                        <img src="${e.target.result}" alt="Preview" class="file-preview-image">
                        <button type="button" class="file-remove-btn" title="Удалить файл">×</button>
                    </div>
                `;
                
                // Добавляем обработчик для удаления файла
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
        if (!this.form) return;

        const formData = new FormData(this.form);
        
        // Добавляем файл если есть
        if (this.currentFile) {
            formData.set('attachment', this.currentFile);
        }

        const data: SupportFormData = {
            accountEmail: formData.get('accountEmail') as string,
            topic: formData.get('topic') as string,
            description: formData.get('description') as string,
            contactName: formData.get('contactName') as string,
            contactEmail: formData.get('contactEmail') as string,
            attachment: this.currentFile || undefined
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