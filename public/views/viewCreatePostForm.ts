import { loginStore } from '../stores/storeLogin';
import { dispatcher } from '../dispatcher/dispatcher';
import { createPostStore, CreatePostState } from '../stores/storeCreatePostForm';
import { SidebarMenu, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { selectTheme, createPost, updatePostContent, editPost, uploadMedia, deleteMedia } from '../actions/actionsCreatePostForm';

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
    private readonly maxFileSize = 5 * 1024 * 1024; // 5 MB
    private boundStoreHandler: () => void;
    private isAutoOpened: boolean = false;
    private mediaUrls: string[] = [];

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

        // Обновляем медиа URL при изменении в сторе
        if (state.mediaUrls && JSON.stringify(this.mediaUrls) !== JSON.stringify(state.mediaUrls)) {
            this.mediaUrls = [...state.mediaUrls];
            this.updateMediaPreviews();
        }

        this.updateUIFromState(state);
    }

    private triggerPostsReload(): void {
        // Отправляем действие для перезагрузки ленты
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
            submitBtn.disabled = state.isCreating || state.isUploadingMedia;
            
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

        const charCounter = this.formElement.querySelector('.char-counter__number');
        if (charCounter) {
            charCounter.textContent = (this.maxChars - state.draftContent.length).toString();
        }

        // Показываем индикатор загрузки медиа
        this.showUploadIndicator(state.isUploadingMedia);
    }

    private updateMediaPreviews(): void {
        if (!this.formElement) return;

        const mediaContainer = this.formElement.querySelector('[data-key="media-container"]');
        if (!mediaContainer) return;

        // Очищаем контейнер
        mediaContainer.innerHTML = '';

        // Добавляем превью для каждого медиафайла
        this.mediaUrls.forEach(mediaUrl => {
            const previewElement = document.createElement('div');
            previewElement.className = 'create-post-form__media-preview';
            previewElement.setAttribute('data-media-url', mediaUrl);
            
            // Определяем тип файла по расширению
            const extension = mediaUrl.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
            const isVideo = ['mp4', 'avi', 'mov', 'wmv'].includes(extension);
            const isDocument = ['pdf', 'doc', 'docx', 'txt'].includes(extension);
            
            if (isImage) {
                previewElement.innerHTML = `
                    <img src="${mediaUrl}" alt="Загруженное изображение" class="create-post-form__media-preview-image">
                    <button type="button" class="create-post-form__media-remove" data-media-url="${mediaUrl}" title="Удалить файл">&times;</button>
                `;
                previewElement.setAttribute('data-media-type', 'image');
            } else if (isVideo) {
                previewElement.innerHTML = `
                    <div class="create-post-form__media-preview-video">
                        <div class="video-icon">🎬</div>
                    </div>
                    <button type="button" class="create-post-form__media-remove" data-media-url="${mediaUrl}" title="Удалить файл">&times;</button>
                `;
                previewElement.setAttribute('data-media-type', 'video');
            } else if (isDocument) {
                previewElement.innerHTML = `
                    <div class="create-post-form__media-preview-document">
                        <div class="document-icon">📄</div>
                        <span class="document-name">${extension.toUpperCase()}</span>
                    </div>
                    <button type="button" class="create-post-form__media-remove" data-media-url="${mediaUrl}" title="Удалить файл">&times;</button>
                `;
                previewElement.setAttribute('data-media-type', 'document');
            } else {
                previewElement.innerHTML = `
                    <div class="create-post-form__media-preview-other">
                        <div class="file-icon">📎</div>
                        <span class="file-name">Файл</span>
                    </div>
                    <button type="button" class="create-post-form__media-remove" data-media-url="${mediaUrl}" title="Удалить файл">&times;</button>
                `;
                previewElement.setAttribute('data-media-type', 'other');
            }

            mediaContainer.appendChild(previewElement);

            // Добавляем обработчик удаления
            const removeBtn = previewElement.querySelector('.create-post-form__media-remove');
            removeBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleMediaRemove(mediaUrl);
            });
        });
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

    private showUploadIndicator(show: boolean): void {
        if (!this.formElement) return;

        const mediaInput = this.formElement.querySelector('[data-key="media-upload"]') as HTMLInputElement;
        const mediaLabel = this.formElement.querySelector('.create-post-form__media-upload-label');
        
        if (mediaInput) {
            mediaInput.disabled = show;
        }
        
        if (mediaLabel) {
            mediaLabel.classList.toggle('disabled', show);
        }

        // Показываем/скрываем индикатор загрузки
        let indicator = this.formElement.querySelector('.upload-indicator');
        if (show && !indicator) {
            indicator = document.createElement('div');
            indicator.className = 'upload-indicator';
            indicator.textContent = 'Загрузка файлов';
            const actions = this.formElement.querySelector('.create-post-form__left-actions');
            actions?.appendChild(indicator);
        } else if (!show && indicator) {
            indicator.remove();
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
        this.mediaUrls = state.mediaUrls || [];
        this.updateMediaPreviews();
        
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

            const fd = new FormData(form);
            let title = fd.get('title');
            let content = fd.get('content');

            if (typeof title !== 'string') title = '';
            if (typeof content !== 'string') content = '';

            title = title.trim();

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
                title,
                content,
                topic_id: state.currentThemeId,
                mediaUrls: this.mediaUrls
            };

            if (state.isEditing && state.editingPostId) {
                editPost(state.editingPostId, data);
            } else {
                createPost(data);
            }
        });

        const textarea = this.formElement.querySelector('[data-key="post-content"]') as HTMLTextAreaElement;
        textarea?.addEventListener('input', (e) => {
            const val = (e.target as HTMLTextAreaElement).value;
            updatePostContent(val);
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

        // Обработчик загрузки медиафайлов
        const mediaInput = this.formElement.querySelector('[data-key="media-upload"]') as HTMLInputElement;
        mediaInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                this.handleMediaUpload(Array.from(files));
            }
        });
    }

    private async handleMediaUpload(files: File[]): Promise<void> {
        console.log('handleMediaUpload called with:', files);
        console.log('Files type:', typeof files);
        console.log('Is array?', Array.isArray(files));
        console.log('Files count:', files?.length);
        
        if (!files || files.length === 0) {
            console.log('No files selected');
            return;
        }

        // Проверяем каждый файл
        const validFiles = [];
        const invalidFiles = [];
        
        for (const file of files) {
            if (file instanceof File) {
                console.log('Valid file:', file.name, 'size:', file.size);
                validFiles.push(file);
            } else {
                console.error('Invalid file object:', file);
                invalidFiles.push(file);
            }
        }
        
        if (invalidFiles.length > 0) {
            console.error('Invalid files detected:', invalidFiles);
        }

        if (validFiles.length === 0) {
            console.log('No valid files to upload');
            return;
        }

        // Проверяем размер файлов
        const tooLargeFiles: string[] = [];
        const sizeCheckedFiles: File[] = [];

        validFiles.forEach(file => {
            if (file.size > this.maxFileSize) {
                console.log('File too large:', file.name, 'size:', file.size);
                tooLargeFiles.push(file.name);
            } else {
                sizeCheckedFiles.push(file);
            }
        });

        if (tooLargeFiles.length > 0) {
            this.showError(`Следующие файлы превышают лимит 5 МБ: ${tooLargeFiles.join(', ')}`);
        }

        if (sizeCheckedFiles.length === 0) {
            console.log('No files passed size check');
            return;
        }

        // Проверяем общее количество файлов
        const state = createPostStore.getState();
        const totalFiles = (state.mediaUrls?.length || 0) + sizeCheckedFiles.length;
        if (totalFiles > 10) {
            this.showError('Максимальное количество файлов - 10');
            return;
        }

        console.log('Calling uploadMedia with', sizeCheckedFiles.length, 'valid files');
        const postId = state.isEditing ? state.editingPostId : undefined;
        
        // Вызываем действие загрузки медиа
        console.log('Dispatching MEDIA_UPLOAD_REQUEST...');
        uploadMedia(sizeCheckedFiles, postId);
        console.log('MEDIA_UPLOAD_REQUEST dispatched');
    }

    private async handleMediaRemove(mediaUrl: string): Promise<void> {
        const state = createPostStore.getState();
        const postId = state.isEditing ? state.editingPostId : undefined;
        
        // Вызываем действие удаления медиа
        deleteMedia(mediaUrl, postId);
    }

    destroy(): void {
        createPostStore.removeListener(this.boundStoreHandler);
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.remove();
            this.formElement = null;
        }
        // Сбрасываем состояние формы
        dispatcher.dispatch('CREATE_POST_FORM_INIT');
        this.isAutoOpened = false;
        this.mediaUrls = [];
    }
}