import './TechSupport.scss';
import '../FormButton/FormButton.scss';

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
    appeal_id?: string;
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
        window.parent.postMessage({ 
            type: 'IFRAME_READY', 
            source: 'tech-support' 
        }, '*');
        
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
        // Разрешаем сообщения с того же origin или без origin (для локальной разработки)
        if (event.origin && event.origin !== window.location.origin) {
            console.log('🚫 Message from different origin:', event.origin);
            return;
        }
        
        const { type, payload, source } = event.data;
        
        console.log('📨 Processing message:', { type, source, payload });
        
        // Принимаем сообщения от родительского окна или без указанного source
        if (!source || source === 'main-window' || source === 'tech-support-parent') {
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
                case 'APPEALS_LOAD_SUCCESS':
                    // Получаем обращения из API и заменяем полностью старый список
                    const newAppeals = payload.appeals || [];
                    console.log('📋 Loaded appeals from API:', newAppeals);
                    
                    // Полностью заменяем старый список на новый (дедуплицированный)
                    this.appeals = this.deduplicateAppeals(newAppeals);
                    console.log('📋 Final appeals after deduplication:', this.appeals);
                    
                    // Обновляем историю на форме
                    this.renderAppealsHistory();
                    break;
                case 'APPEALS_LOAD_FAIL':
                    console.error('Failed to load appeals:', payload.error);
                    break;
                case 'SUPPORT_TICKET_SUBMIT_SUCCESS':
                    console.log('✅ Ticket submitted successfully, reloading appeals...');
                    // Обращение успешно отправлено, показываем успешное сообщение
                    this.showSuccessMessage();
                    break;
                case 'SUPPORT_TICKET_SUBMIT_FAIL':
                    console.error('❌ Ticket submission failed:', payload.error);
                    this.showError(payload.error);
                    this.setLoading(false);
                    this.isSubmitting = false;
                    break;
            }
        }
    }

        private showSuccessMessage(): void {
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl) return;

        console.log('✅ Showing success message');

        // Создаем HTML для успешного сообщения
        const successHtml = `
            <div class="tech-support-iframe">
                <div class="tech-support-modal">
                    <div class="success-message">
                        <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                        <h2 style="margin-bottom: 16px;">Обращение отправлено</h2>
                        <p style="color: var(--text-lighter); margin-bottom: 24px;">
                            Ваше обращение успешно отправлено.<br>
                            Мы ответим вам в ближайшее время.
                        </p>
                        <div class="button-container">
                            <button type="button" class="form__button" id="newAppealAfterSuccess">
                                Отправить новое обращение
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        contentEl.innerHTML = successHtml;
        
        // Добавляем обработчик для кнопки "Отправить новое обращение"
        const newAppealBtn = contentEl.querySelector('#newAppealAfterSuccess') as HTMLButtonElement;
        if (newAppealBtn) {
            newAppealBtn.addEventListener('click', () => {
                console.log('🔄 Creating new appeal after success');
                this.reloadForm();
            });
        }
        
        console.log('✅ Success message displayed');
    }

    /**
     * Дедуплицирует обращения по ID
     */
    private deduplicateAppeals(appeals: Appeal[]): Appeal[] {
        const uniqueMap = new Map();
        
        appeals.forEach(appeal => {
            // Используем appeal_id или id как ключ для дедупликации
            const key = appeal.appeal_id || appeal.id;
            if (key) {
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, appeal);
                } else {
                    console.log('🔄 Found duplicate appeal, skipping:', key);
                }
            } else {
                console.warn('⚠️ Appeal without ID found:', appeal);
                // Если нет ID, используем комбинацию полей как ключ
                const fallbackKey = `${appeal.email_registered}_${appeal.problem_description}_${appeal.createdAt}`;
                if (!uniqueMap.has(fallbackKey)) {
                    uniqueMap.set(fallbackKey, appeal);
                }
            }
        });
        
        const uniqueAppeals = Array.from(uniqueMap.values());
        
        // Сортируем по дате создания (новые сверху)
        return uniqueAppeals.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA; // Новые сверху
        });
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
                
                // Добавляем историю обращений под формой
                this.renderAppealsHistory();
            } else {
                console.error('❌ Form element not found');
            }
        } catch (error) {
            console.error('❌ Error rendering template:', error);
        }
    }

    private reloadForm(): void {
        this.currentFile = null;
        this.isSubmitting = false;
        this.renderForm();
        this.loadAppealsHistory();
    }

    private renderAppealsHistory(): void {
        if (!this.historyTemplate) {
            console.error('❌ History template not loaded');
            return;
        }
        
        const formContainer = this.form?.closest('.tech-support-modal');
        if (!formContainer) {
            console.error('❌ Form container not found');
            return;
        }

        // Удаляем старую историю если есть
        const existingHistory = formContainer.querySelector('.appeals-history');
        if (existingHistory) {
            console.log('🗑️ Removing existing history');
            existingHistory.remove();
        }

        // Если нет обращений, не показываем историю
        if (this.appeals.length === 0) {
            console.log('ℹ️ No appeals to display');
            return;
        }

        console.log('🔄 Rendering appeals history with:', this.appeals.length, 'appeals');

        const appealsWithFormattedData = this.appeals.map(appeal => {
            // Форматируем дату с проверкой валидности
            let formattedDate = 'Недавно';
            if (appeal.createdAt) {
                const date = new Date(appeal.createdAt);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
            
            return {
                ...appeal,
                statusColor: this.getStatusColor(appeal.status),
                statusText: this.getStatusText(appeal.status),
                categoryName: this.getCategoryName(appeal.category_id),
                formattedDate: formattedDate
            };
        });

        const historyHtml = this.historyTemplate({
            appeals: appealsWithFormattedData,
            hasAppeals: this.appeals.length > 0
        });
        
        // Вставляем историю после формы
        const historyElement = document.createElement('div');
        historyElement.innerHTML = historyHtml;
        formContainer.appendChild(historyElement);
        
        console.log('✅ Appeals history rendered, element:', historyElement);
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
            type: 'APPEALS_LOAD_REQUEST',
            source: 'tech-support'
        }, '*');
    }

    private showSuccessAndHistory(): void {
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl || !this.historyTemplate) return;

        console.log('🔄 Showing success message and history with appeals:', this.appeals);

        const appealsWithFormattedData = this.appeals.map(appeal => {
            // Форматируем дату с проверкой валидности
            let formattedDate = 'Недавно';
            if (appeal.createdAt) {
                const date = new Date(appeal.createdAt);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
            
            return {
                ...appeal,
                statusColor: this.getStatusColor(appeal.status),
                statusText: this.getStatusText(appeal.status),
                categoryName: this.getCategoryName(appeal.category_id),
                formattedDate: formattedDate
            };
        });

        const html = this.historyTemplate({
            appeals: appealsWithFormattedData,
            hasAppeals: this.appeals.length > 0
        });
        
        contentEl.innerHTML = html;
        
        // Добавляем обработчик для кнопки "Отправить новое обращение"
        const newAppealBtn = contentEl.querySelector('#newAppealAfterSuccess');
        if (newAppealBtn) {
            newAppealBtn.addEventListener('click', () => {
                console.log('🔄 Creating new appeal after success');
                this.renderForm();
                this.loadAppealsHistory();
            });
        }
        
        console.log('✅ Success message and history displayed');
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