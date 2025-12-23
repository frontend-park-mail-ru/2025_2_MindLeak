import { loginStore } from '../stores/storeLogin';
import { dispatcher } from '../dispatcher/dispatcher';
import { createPostStore, CreatePostState } from '../stores/storeCreatePostForm';
import { SidebarMenu, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { 
    selectTheme, 
    createPost, 
    updatePostContent, 
    editPost,
    removeAttachment 
} from '../actions/actionsCreatePostForm';

let createPostTemplate: Handlebars.TemplateDelegate | null = null;

async function getCreatePostTemplate(): Promise<Handlebars.TemplateDelegate> {
    if (createPostTemplate) return createPostTemplate;

    const partials = [
        { name: 'input', path: '/components/Input/Input.hbs' },
        { name: 'form-button', path: '/components/FormButton/FormButton.hbs' },
        { name: 'icon', path: '/components/Icon/Icon.hbs' },
        { name: 'user-menu', path: '/components/UserMenu/UserMenu.hbs' },
        { name: 'menu-item', path: '/components/MenuItem/MenuItem.hbs' }
    ];

    await Promise.all(
        partials.map(async (p) => {
            if (!Handlebars.partials[p.name]) {
                const res = await fetch(p.path);
                const src = await res.text();
                Handlebars.registerPartial(p.name, Handlebars.compile(src));
            }
        })
    );

    const res = await fetch('/components/CreatePostForm/CreatePostForm.hbs');
    const src = await res.text();
    createPostTemplate = Handlebars.compile(src);
    return createPostTemplate;
}

class ThemeSelectorPopup {
    private popupElement: HTMLElement | null = null;
    constructor(private onSelect: (topic_id: number, themeName: string) => void) {}

    async render(): Promise<HTMLElement> {
        const div = document.createElement('div');
        div.className = 'theme-selector-popup';

        const sidebarMenu = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (selectedKey) => {
                const item = SECONDARY_MENU_ITEMS.find(i => i.key === selectedKey);
                if (item) {
                    this.onSelect(item.topic_id || 0, item.text);
                }
                this.close();
            }
        );

        const menuEl = await sidebarMenu.render();
        menuEl.classList.add('theme-selector-popup__menu');
        div.appendChild(menuEl);

        // для того чтобы два клика обрабатывались нормально
        setTimeout(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (!div.contains(e.target as Node)) {
                    this.close();
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            document.addEventListener('click', handleClickOutside);
        }, 0);

        document.body.appendChild(div);
        this.popupElement = div;
        return div;
    }

    close(): void {
        if (this.popupElement?.parentNode) {
            this.popupElement.remove();
        }
        this.popupElement = null;
    }
}

export class CreatePostFormView {
    private formElement: HTMLElement | null = null;
    private readonly maxChars = 5000;
    private boundStoreHandler: () => void;
    private isAutoOpened: boolean = false;

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        createPostStore.addListener(this.boundStoreHandler);
    }

    private handleStoreChange(): void {
        const state = createPostStore.getState();

        // ВАЖНО: Автоматически открываем форму при загрузке данных для редактирования
        if (state.isEditing && state.editingPostId && !this.formElement && !this.isAutoOpened) {
            this.isAutoOpened = true;
            this.openForm();
            return;
        }

        // ВАЖНО: Автоматически закрываем форму после успешного создания/редактирования
        if (state.success && this.formElement) {
            
            // ЗАКРЫВАЕМ ФОРМУ ПЕРЕД перезагрузкой
            this.destroy();
            
            // Затем запускаем перезагрузку
            this.triggerPostsReload();
            
            const message = state.isEditing 
                ? 'Пост успешно отредактирован!' 
                : 'Пост успешно опубликован!';
                
            dispatcher.dispatch('SHOW_NOTIFICATION', {
                type: 'success',
                message: message
            });
            
            return; // Выходим чтобы не выполнять остальной код
        }

        if (state.error) {
            this.showError(state.error);
        }

        this.updateUIFromState(state);
    }

    private triggerPostsReload(): void {
        // Отправляем действие для перезагрузки ленты
        dispatcher.dispatch('POSTS_RELOAD_AFTER_CREATE');
        dispatcher.dispatch('POSTS_RELOAD_AFTER_CREATE');
    }

    public async openForEdit(): Promise<void> {
        if (this.formElement) {
            return; // Форма уже открыта
        }
        
        this.isAutoOpened = true;
        await this.openForm();
    }

    private async openForm(): Promise<void> {
        const formElement = await this.render();
        document.body.appendChild(formElement);
    }

    private updateUIFromState(state: CreatePostState): void {
        if (!this.formElement) return;

        const submitBtn = this.formElement.querySelector('[data-key="submit-post"]') as HTMLButtonElement;
        if (submitBtn) {
            submitBtn.disabled = state.isCreating;
            
            if (state.isEditing) {
                submitBtn.textContent = state.isCreating ? 'Сохранение...' : 'Сохранить изменения';
            } else {
                submitBtn.textContent = state.isCreating ? 'Публикация...' : 'Опубликовать';
            }
        }

        const subtitle = this.formElement.querySelector('.user-menu__subtitle');
        if (subtitle) subtitle.textContent = state.currentTheme;

        const themeBtn = this.formElement.querySelector('[data-key="select-theme"]');
        if (themeBtn) {
            const isThemeSelected = state.currentThemeId !== 0;
            themeBtn.textContent = isThemeSelected ? 'Сменить тему' : 'Выбрать тему';
            themeBtn.classList.toggle('theme-button--selected', isThemeSelected);
        }

        const textarea = this.formElement.querySelector('[data-key="post-content"]') as HTMLTextAreaElement;
        const titleInput = this.formElement.querySelector('[data-key="post-title"]') as HTMLInputElement;

        if (textarea && textarea.value !== state.draftContent) {
            textarea.value = state.draftContent;
        }
        if (titleInput && titleInput.value !== state.draftTitle) {
            titleInput.value = state.draftTitle;
        }

        const charCounter = this.formElement.querySelector('.create-post-form__char-counter-number');
        if (charCounter) {
            charCounter.textContent = (this.maxChars - state.draftContent.length).toString();
        }

        // Обновляем preview файла
        this.updateAttachmentPreview(state);
    }

    private updateAttachmentPreview(state: CreatePostState): void {
        if (!this.formElement) return;
        
        const previewContainer = this.formElement.querySelector('[data-key="preview-container"]');
        if (!previewContainer) return;
        
        // Очищаем контейнер
        previewContainer.innerHTML = '';
        
        if (!state.previewUrl) return;
        
        // Добавляем preview для файла
        const item = document.createElement('div');
        item.className = 'attachment-preview__item';
        
        const isImage = state.previewUrl.startsWith('data:image') || 
                       state.previewUrl.match(/\.(jpeg|jpg|png|gif|webp|bmp|svg)$/i);
        
        const fileName = state.attachment?.name || 'Прикрепленный файл';
        
        item.innerHTML = `
            <div class="attachment-preview__image">
                ${isImage 
                    ? `<img src="${state.previewUrl}" alt="Прикрепленное изображение" loading="lazy">`
                    : `<div class="attachment-preview__document">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>`
                }
            </div>
            <button type="button" class="attachment-preview__remove" data-key="remove-attachment">
                ×
            </button>
            <div class="attachment-preview__file-info">
                ${fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}
            </div>
        `;
        
        previewContainer.appendChild(item);
    }

    private updateCharCounter(): void {
        if (!this.formElement) return;
        
        const state = createPostStore.getState();
        const charCounter = this.formElement.querySelector('.create-post-form__char-counter-number');
        
        if (charCounter) {
            charCounter.textContent = (this.maxChars - state.draftContent.length).toString();
        }
    }

    private showError(message: string): void {
        if (!this.formElement) return;

        const old = this.formElement.querySelector('.create-post-form__error');
        if (old) old.remove();

        const errorEl = document.createElement('div');
        errorEl.className = 'create-post-form__error';
        errorEl.textContent = message;
        const form = this.formElement.querySelector('[data-key="create-post-form"]');
        if (form?.parentNode) {
            form.parentNode.insertBefore(errorEl, form);
        }
    }

    async render(): Promise<HTMLElement> {
        const template = await getCreatePostTemplate();
        const auth = loginStore.getState();
        const state = createPostStore.getState();

        const props = {
            name: auth.user?.name || 'Анонимный пользователь',
            subtitle: state.currentTheme,
            avatar: auth.user?.avatar || '/img/defaultAvatar.jpg',
            isEditing: state.isEditing
        };

        const html = template(props);
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        this.formElement = div.firstElementChild as HTMLElement;
        this.formElement.classList.add('create-post-form--modal');

        this.setupEventHandlers();
        this.updateUIFromState(state);
        this.updateCharCounter();
        return this.formElement;
    }

    private setupEventHandlers(): void {
        if (!this.formElement) return;

        const overlay = this.formElement.querySelector('[data-key="overlay"]');
        overlay?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.destroy();
            }
        });

        const form = this.formElement.querySelector('[data-key="create-post-form"]') as HTMLFormElement;
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });

        const textarea = this.formElement.querySelector('[data-key="post-content"]') as HTMLTextAreaElement;
        textarea?.addEventListener('input', (e) => {
            const val = (e.target as HTMLTextAreaElement).value;
            updatePostContent(val);
            this.updateCharCounter();
        });

        const titleInput = this.formElement.querySelector('[data-key="post-title"]') as HTMLInputElement;
        titleInput?.addEventListener('input', (e) => {
            dispatcher.dispatch('POST_TITLE_CHANGED', { title: (e.target as HTMLInputElement).value });
        });

        const themeBtn = this.formElement.querySelector('[data-key="select-theme"]');
        themeBtn?.addEventListener('click', async () => {
            const popup = new ThemeSelectorPopup((topic_id, themeName) => {
                selectTheme(themeName, topic_id); 
            });
            await popup.render();
        });

        const closeButton = this.formElement.querySelector('[data-key="close-button"]');
        closeButton?.addEventListener('click', () => {
            this.destroy();
        });

        // Обработчик кнопки прикрепления файлов
        const attachButton = this.formElement.querySelector('[data-key="attach-button"]');
        attachButton?.addEventListener('click', () => {
            const fileInput = this.formElement?.querySelector('[data-key="file-input"]') as HTMLInputElement;
            fileInput?.click();
        });

        // Обработчик удаления файла
        this.formElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.matches('[data-key="remove-attachment"]')) {
                removeAttachment();
            }
        });

        // Обработчик кнопки добавления файла (иконка)
        const addFileIcon = this.formElement.querySelector('[data-key="add-file"]');
        addFileIcon?.addEventListener('click', () => {
            const fileInput = this.formElement?.querySelector('[data-key="file-input"]') as HTMLInputElement;
            fileInput?.click();
        });

        // Обработчик выбора файла
        const fileInput = this.formElement.querySelector('[data-key="file-input"]') as HTMLInputElement;
        fileInput?.addEventListener('change', this.handleFileSelect.bind(this));
    }

    private async handleFileSelect(e: Event): Promise<void> {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0]; // Берем только первый файл
        
        // Валидация файла
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpeg|jpg|png|gif|webp|bmp|pdf|doc|docx|txt)$/i)) {
            this.showError(`Файл "${file.name}" имеет недопустимый формат. Разрешены: изображения, PDF, документы`);
            input.value = '';
            return;
        }
        
        if (file.size > maxSize) {
            this.showError(`Файл "${file.name}" превышает максимальный размер (10MB)`);
            input.value = '';
            return;
        }
        
        // Создаем preview для изображений
        let previewUrl = '';
        if (file.type.startsWith('image/')) {
            try {
                previewUrl = await this.createImagePreview(file);
            } catch (error) {
                console.error('Error creating preview:', error);
                previewUrl = '';
            }
        }
        
        // Отправляем файл в store
        dispatcher.dispatch('ATTACHMENT_ADDED', { 
            file, 
            previewUrl 
        });

        // Сбрасываем input
        input.value = '';
    }

    private createImagePreview(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private async handleFormSubmit(): Promise<void> {
        if (!this.formElement) return;

        const form = this.formElement.querySelector('[data-key="create-post-form"]') as HTMLFormElement;
        const fd = new FormData(form);
        let title = fd.get('title');
        let content = fd.get('content');

        if (typeof title !== 'string') title = '';
        if (typeof content !== 'string') content = '';

        title = title.trim();

        // Валидация
        if (title.length === 0) {
            this.showError('Заголовок не может быть пустым');
            return;
        }
        if (title.length > 200) {
            this.showError('Заголовок не должен превышать 200 символов');
            return;
        }

        if (content.length > 5000) {
            this.showError('Текст поста не должен превышать 5000 символов');
            return;
        }

        const state = createPostStore.getState();
        const data = {
            title: title as string,
            content: content as string,
            topic_id: state.currentThemeId,
            attachment: state.attachment,
            existingMediaUrl: state.previewUrl && !state.previewUrl.startsWith('data:') ? state.previewUrl : null,
            shouldDeleteMedia: state.shouldDeleteMedia // ← передаем флаг удаления
        };

        if (state.isEditing && state.editingPostId) {
            editPost(state.editingPostId, data);
        } else {
            createPost(data);
        }
    }

    destroy(): void {
        // Очищаем data URL для предотвращения утечек памяти
        const state = createPostStore.getState();
        if (state.previewUrl && state.previewUrl.startsWith('data:')) {
            URL.revokeObjectURL(state.previewUrl);
        }

        createPostStore.removeListener(this.boundStoreHandler);
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.remove();
            this.formElement = null;
        }
        // Сбрасываем состояние формы
        dispatcher.dispatch('CREATE_POST_FORM_INIT');
        this.isAutoOpened = false; // СБРАСЫВАЕМ ФЛАГ
    }
}