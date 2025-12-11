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
    
    // Bound обработчики
    private handleSubmitBound: ((e: Event) => Promise<void>) | null = null;
    private fileInputHandler: ((e: Event) => void) | null = null;
    private fileUploadDragOverHandler: ((e: DragEvent) => void) | null = null;
    private fileUploadDragLeaveHandler: ((e: DragEvent) => void) | null = null;
    private fileUploadDropHandler: ((e: DragEvent) => void) | null = null;
    private fileUploadClickHandler: ((e: Event) => void) | null = null;
    private pasteHandler: ((e: ClipboardEvent) => void) | null = null;
    private newAppealBtnHandler: (() => void) | null = null;
    private parentMessageHandler: ((e: MessageEvent) => void) | null = null;
    
    // Флаги управления
    private isInitialized: boolean = false;
    private isAppealsLoading: boolean = false;
    private iframeReadySent: boolean = false;
    private initDataReceived: boolean = false;
    private pendingUserData: UserData | null = null;
    
    // Счетчик экземпляров
    private static instanceCount: number = 0;
    private instanceId: number;
    
    // Singleton
    private static instance: TechSupportIframe | null = null;

    constructor() {
        this.instanceId = ++TechSupportIframe.instanceCount;
        console.log(`🚀 TechSupportIframe #${this.instanceId} creating...`);
        
        // Очищаем предыдущий экземпляр
        if (TechSupportIframe.instance) {
            console.log(`⚠️ Cleaning up previous instance #${TechSupportIframe.instance.instanceId}`);
            TechSupportIframe.instance.cleanup();
        }
        
        TechSupportIframe.instance = this;
        this.init();
    }

    async init(): Promise<void> {
        if (this.isInitialized) {
            console.log(`⚠️ Already initialized #${this.instanceId}`);
            return;
        }
        
        this.isInitialized = true;
        console.log(`🚀 TechSupportIframe #${this.instanceId} initializing...`);
        
        // Настраиваем обработчик сообщений
        this.parentMessageHandler = this.handleParentMessage.bind(this);
        window.removeEventListener('message', this.parentMessageHandler);
        window.addEventListener('message', this.parentMessageHandler);
        
        // Загружаем шаблоны
        await this.loadTemplates();
        
        // Рендерим форму
        this.renderForm();
        
        // Отправляем готовность
        this.sendIframeReady();
    }

    private sendIframeReady(): void {
        if (this.iframeReadySent) {
            return;
        }
        
        this.iframeReadySent = true;
        console.log(`📤 Sending IFRAME_READY from #${this.instanceId}`);
        
        // Отправляем только один раз
        window.parent.postMessage({ 
            type: 'IFRAME_READY', 
            source: 'tech-support',
            instanceId: this.instanceId
        }, '*');
    }

    private cleanup(): void {
        console.log(`🧹 Cleaning up #${this.instanceId}`);
        
        this.removeEventListeners();
        
        if (this.parentMessageHandler) {
            window.removeEventListener('message', this.parentMessageHandler);
            this.parentMessageHandler = null;
        }
        
        // Сбрасываем состояние
        this.form = null;
        this.currentFile = null;
        this.isSubmitting = false;
        this.isInitialized = false;
        this.isAppealsLoading = false;
        this.iframeReadySent = false;
        this.initDataReceived = false;
        this.pendingUserData = null;
        
        // Очищаем контент
        const contentEl = document.getElementById('tech-support-content');
        if (contentEl) {
            contentEl.innerHTML = '';
        }
        
        if (TechSupportIframe.instance === this) {
            TechSupportIframe.instance = null;
        }
    }

    private handleParentMessage(event: MessageEvent): void {
        if (event.origin && event.origin !== window.location.origin) {
            return;
        }
        
        const { type, payload, source, instanceId } = event.data;
        
        // Проверяем instanceId
        const messageForThisInstance = !instanceId || instanceId === this.instanceId;
        if (!messageForThisInstance) {
            return;
        }
        
        if (source === 'main-window') {
            switch (type) {
                case 'INIT_DATA':
                    this.handleInitData(payload);
                    break;
                    
                case 'APPEALS_LOAD_SUCCESS':
                    this.handleAppealsLoadSuccess(payload);
                    break;
                    
                case 'APPEALS_LOAD_FAIL':
                    console.error(`❌ Appeals load failed for #${this.instanceId}:`, payload.error);
                    this.isAppealsLoading = false;
                    break;
                    
                case 'SUPPORT_TICKET_SUBMIT_SUCCESS':
                    this.handleTicketSubmitSuccess();
                    break;
                    
                case 'SUPPORT_TICKET_SUBMIT_FAIL':
                    console.error(`❌ Ticket submission failed for #${this.instanceId}:`, payload.error);
                    this.setLoading(false);
                    this.isSubmitting = false;
                    break;
                    
                case 'CLEANUP':
                    console.log(`🧹 Received CLEANUP for #${this.instanceId}`);
                    this.cleanup();
                    break;
            }
        }
    }

    private handleInitData(payload: any): void {
        if (this.initDataReceived) {
            console.log(`⚠️ INIT_DATA already received for #${this.instanceId}`);
            return;
        }
        
        console.log(`🎉 INIT_DATA RECEIVED for #${this.instanceId}`);
        this.initDataReceived = true;
        
        this.userData = {
            userEmail: payload.userEmail || '',
            userName: payload.userName || '',
            userContactEmail: payload.userContactEmail || payload.userEmail || ''
        };
        
        console.log(`✅ User data set for #${this.instanceId}`);
        
        // Если форма уже создана - заполняем ее
        if (this.form) {
            this.autoFillForm();
        } else {
            // Сохраняем данные для последующего заполнения
            this.pendingUserData = this.userData;
        }
        
        // Загружаем историю обращений
        this.loadAppealsHistory();
    }

    private handleAppealsLoadSuccess(payload: any): void {
        this.isAppealsLoading = false;
        
        const newAppeals = payload.appeals || [];
        console.log(`📋 Appeals loaded for #${this.instanceId}:`, newAppeals.length);
        
        this.appeals = this.deduplicateAppeals(newAppeals);
        console.log(`📋 Final appeals for #${this.instanceId}:`, this.appeals.length);
        
        this.renderAppealsHistory();
    }

    private handleTicketSubmitSuccess(): void {
        console.log(`✅ Ticket submitted successfully for #${this.instanceId}`);
        this.isSubmitting = false;
        this.showSuccessMessage();
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

    private showSuccessMessage(): void {
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl) return;

        console.log(`✅ Showing success message for #${this.instanceId}`);

        const successHtml = `
            <div class="tech-support__iframe">
                <div class="tech-support__modal">
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
        
        const newAppealBtn = contentEl.querySelector('#newAppealAfterSuccess') as HTMLButtonElement;
        if (newAppealBtn) {
            if (this.newAppealBtnHandler) {
                newAppealBtn.removeEventListener('click', this.newAppealBtnHandler);
            }
            
            this.newAppealBtnHandler = () => {
                console.log(`🔄 Creating new appeal for #${this.instanceId}`);
                this.reloadForm();
            };
            newAppealBtn.addEventListener('click', this.newAppealBtnHandler);
        }
    }

    private deduplicateAppeals(appeals: Appeal[]): Appeal[] {
        const uniqueMap = new Map();
        
        appeals.forEach(appeal => {
            const key = appeal.appeal_id || appeal.id;
            if (key) {
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, appeal);
                }
            } else {
                const fallbackKey = `${appeal.email_registered}_${appeal.problem_description}_${appeal.createdAt}`;
                if (!uniqueMap.has(fallbackKey)) {
                    uniqueMap.set(fallbackKey, appeal);
                }
            }
        });
        
        const uniqueAppeals = Array.from(uniqueMap.values());
        
        return uniqueAppeals.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    }

    private autoFillForm(): void {
        if (!this.form) {
            console.log(`⚠️ Form not found for autofill for #${this.instanceId}`);
            return;
        }

        console.log(`🔄 Auto-filling form for #${this.instanceId}`);
        
        const accountEmailInput = this.form.querySelector('[name="email_registered"]') as HTMLInputElement;
        const contactNameInput = this.form.querySelector('[name="name"]') as HTMLInputElement;
        const contactEmailInput = this.form.querySelector('[name="email_for_connection"]') as HTMLInputElement;

        if (accountEmailInput && this.userData.userEmail) {
            accountEmailInput.value = this.userData.userEmail;
        }
        
        if (contactNameInput && this.userData.userName) {
            contactNameInput.value = this.userData.userName;
        }
        
        if (contactEmailInput) {
            const emailToUse = this.userData.userContactEmail || this.userData.userEmail || '';
            contactEmailInput.value = emailToUse;
        }
    }

    private renderForm(): void {
        console.log(`🔄 Rendering form for #${this.instanceId}...`);
        
        if (!this.template) {
            console.error(`❌ Template not loaded for #${this.instanceId}`);
            return;
        }
        
        const contentEl = document.getElementById('tech-support-content');
        if (!contentEl) {
            console.error(`❌ Content element not found for #${this.instanceId}`);
            return;
        }

        try {
            this.removeEventListeners();
            
            const html = this.template({ 
                userEmail: this.userData.userEmail || '',
                userName: this.userData.userName || '',
                userContactEmail: this.userData.userContactEmail || this.userData.userEmail || ''
            });
            
            contentEl.innerHTML = html;
            
            this.form = document.getElementById('supportForm') as HTMLFormElement;
            if (this.form) {
                console.log(`✅ Form found and setup for #${this.instanceId}`);
                
                this.setupEventListeners();
                
                // Если есть pending данные - заполняем форму
                if (this.pendingUserData) {
                    this.userData = this.pendingUserData;
                    this.pendingUserData = null;
                    this.autoFillForm();
                } else if (this.userData.userEmail) {
                    // Или если уже есть данные
                    this.autoFillForm();
                }
                
                // Отображаем историю если есть
                if (this.appeals.length > 0) {
                    this.renderAppealsHistory();
                }
            }
        } catch (error) {
            console.error(`❌ Error rendering template for #${this.instanceId}:`, error);
        }
    }

    private setupEventListeners(): void {
        if (!this.form) return;
        
        this.handleSubmitBound = this.handleSubmit.bind(this);
        this.form.addEventListener('submit', this.handleSubmitBound);
        this.setupFileUpload();
    }

    private removeEventListeners(): void {
        if (this.form && this.handleSubmitBound) {
            this.form.removeEventListener('submit', this.handleSubmitBound);
            this.handleSubmitBound = null;
        }
        
        this.removeFileUploadListeners();
        
        if (this.newAppealBtnHandler) {
            const newAppealBtn = document.getElementById('newAppealAfterSuccess');
            if (newAppealBtn) {
                newAppealBtn.removeEventListener('click', this.newAppealBtnHandler);
            }
            this.newAppealBtnHandler = null;
        }
    }

    private removeFileUploadListeners(): void {
        const fileInput = this.form?.querySelector('input[type="file"]') as HTMLInputElement;
        const fileUpload = this.form?.querySelector('#fileUpload') as HTMLElement;
        
        if (fileInput && this.fileInputHandler) {
            fileInput.removeEventListener('change', this.fileInputHandler);
            this.fileInputHandler = null;
        }
        
        if (fileUpload) {
            if (this.fileUploadDragOverHandler) {
                fileUpload.removeEventListener('dragover', this.fileUploadDragOverHandler);
                this.fileUploadDragOverHandler = null;
            }
            if (this.fileUploadDragLeaveHandler) {
                fileUpload.removeEventListener('dragleave', this.fileUploadDragLeaveHandler);
                this.fileUploadDragLeaveHandler = null;
            }
            if (this.fileUploadDropHandler) {
                fileUpload.removeEventListener('drop', this.fileUploadDropHandler);
                this.fileUploadDropHandler = null;
            }
            if (this.fileUploadClickHandler) {
                fileUpload.removeEventListener('click', this.fileUploadClickHandler);
                this.fileUploadClickHandler = null;
            }
        }
        
        if (this.pasteHandler) {
            document.removeEventListener('paste', this.pasteHandler);
            this.pasteHandler = null;
        }
    }

    private reloadForm(): void {
        console.log(`🔄 Reloading form for #${this.instanceId}...`);
        this.renderForm();
    }

    private renderAppealsHistory(): void {
        if (!this.historyTemplate || !this.form) {
            return;
        }
        
        const formContainer = this.form.closest('.tech-support__modal') || this.form.parentElement;
        if (!formContainer) {
            return;
        }

        const existingHistory = formContainer.querySelector('.appeals-history');
        if (existingHistory) {
            existingHistory.remove();
        }

        if (this.appeals.length === 0) {
            return;
        }

        console.log(`🔄 Rendering appeals history for #${this.instanceId}:`, this.appeals.length, 'appeals');

        const appealsWithFormattedData = this.appeals.map(appeal => {
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
        
        const historyElement = document.createElement('div');
        historyElement.className = 'appeals-history';
        historyElement.innerHTML = historyHtml;
        formContainer.appendChild(historyElement);
    }

    private setupFileUpload(): void {
        const fileInput = this.form?.querySelector('input[type="file"]') as HTMLInputElement;
        const filePreview = this.form?.querySelector('#filePreview') as HTMLElement;
        const fileUpload = this.form?.querySelector('#fileUpload') as HTMLElement;
        const fileLabel = this.form?.querySelector('.file-upload__label') as HTMLElement;

        if (fileInput && filePreview && fileUpload && fileLabel) {
            this.fileInputHandler = (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) this.handleFileSelect(file, filePreview, fileLabel);
            };
            fileInput.addEventListener('change', this.fileInputHandler);

            this.fileUploadDragOverHandler = (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.add('drag-over');
            };
            this.fileUploadDragLeaveHandler = (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.remove('drag-over');
            };
            this.fileUploadDropHandler = (e: DragEvent) => {
                e.preventDefault();
                fileUpload.classList.remove('drag-over');
                
                const files = e.dataTransfer?.files;
                if (files && files[0]) {
                    fileInput.files = files;
                    this.handleFileSelect(files[0], filePreview, fileLabel);
                }
            };
            this.fileUploadClickHandler = (e: Event) => {
                if (e.target !== fileInput && !(e.target as Element).closest('.file-remove-btn')) {
                    fileInput.click();
                }
            };

            fileUpload.addEventListener('dragover', this.fileUploadDragOverHandler);
            fileUpload.addEventListener('dragleave', this.fileUploadDragLeaveHandler);
            fileUpload.addEventListener('drop', this.fileUploadDropHandler);
            fileUpload.addEventListener('click', this.fileUploadClickHandler);

            this.pasteHandler = (e: ClipboardEvent) => {
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
            };
            document.addEventListener('paste', this.pasteHandler);
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
        
        console.log(`🔄 Form submission started for #${this.instanceId}`);
        
        if (this.isSubmitting || !this.form) {
            return;
        }

        this.isSubmitting = true;
        this.setLoading(true);

        const formData = new FormData(this.form);
        const data: SupportFormData = {
            email_registered: formData.get('email_registered') as string,
            category_id: formData.get('category_id') as string,
            problem_description: formData.get('problem_description') as string,
            name: formData.get('name') as string,
            email_for_connection: formData.get('email_for_connection') as string,
            attachment: this.currentFile || undefined
        };

        console.log(`📝 Form data prepared for #${this.instanceId}`);

        const errors = this.validateForm(data);
        if (errors.length > 0) {
            this.showFieldErrors(errors);
            this.setLoading(false);
            this.isSubmitting = false;
            return;
        }

        console.log(`✅ Form validation passed for #${this.instanceId}`);
        
        this.clearErrors();

        try {
            window.parent.postMessage({ 
                type: 'SUPPORT_TICKET_SUBMIT_REQUEST', 
                payload: data,
                source: 'tech-support',
                instanceId: this.instanceId
            }, '*');
            
        } catch (error) {
            console.error(`❌ Error sending message for #${this.instanceId}:`, error);
            this.showError('Ошибка отправки: ' + (error as Error).message);
            this.setLoading(false);
            this.isSubmitting = false;
        }
    }

    private loadAppealsHistory(): void {
        if (this.isAppealsLoading) {
            console.log(`⏳ Appeals already loading for #${this.instanceId}`);
            return;
        }
        
        this.isAppealsLoading = true;
        console.log(`📤 Requesting appeals load for #${this.instanceId}`);
        
        window.parent.postMessage({ 
            type: 'APPEALS_LOAD_REQUEST',
            source: 'tech-support',
            instanceId: this.instanceId
        }, '*');
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 TechSupport iframe loaded');
    new TechSupportIframe();
});

//FFFFFFFFFFFFF