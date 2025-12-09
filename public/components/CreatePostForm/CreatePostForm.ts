export class CreatePostForm {
    private element: HTMLElement | null = null;
    private mediaUrls: string[] = [];
    private onMediaUpload: (files: File[]) => void;
    private onMediaRemove: (mediaUrl: string) => void;

    constructor(
        onMediaUpload: (files: File[]) => void,
        onMediaRemove: (mediaUrl: string) => void
    ) {
        this.onMediaUpload = onMediaUpload;
        this.onMediaRemove = onMediaRemove;
    }

    init(element: HTMLElement): void {
        this.element = element;
        this.setupMediaHandlers();
    }

    addMediaPreview(mediaUrl: string): void {
        if (!this.element) return;

        const mediaContainer = this.element.querySelector('[data-key="media-container"]');
        if (!mediaContainer) return;

        // Проверяем, не добавлено ли уже это изображение
        if (this.mediaUrls.includes(mediaUrl)) return;

        this.mediaUrls.push(mediaUrl);

        const previewElement = document.createElement('div');
        previewElement.className = 'create-post-form__media-preview';
        previewElement.setAttribute('data-media-url', mediaUrl);
        
        previewElement.innerHTML = `
            <img src="${mediaUrl}" alt="Загруженное медиа" class="create-post-form__media-preview-image">
            <button type="button" class="create-post-form__media-remove" data-media-url="${mediaUrl}">&times;</button>
        `;

        mediaContainer.appendChild(previewElement);
        
        // Добавляем обработчик удаления
        const removeBtn = previewElement.querySelector('.create-post-form__media-remove');
        removeBtn?.addEventListener('click', () => {
            this.removeMediaPreview(mediaUrl);
            this.onMediaRemove(mediaUrl);
        });
    }

    removeMediaPreview(mediaUrl: string): void {
        if (!this.element) return;

        const preview = this.element.querySelector(`[data-media-url="${mediaUrl}"]`);
        preview?.remove();
        
        // Удаляем из массива
        this.mediaUrls = this.mediaUrls.filter(url => url !== mediaUrl);
    }

    clearMediaPreviews(): void {
        if (!this.element) return;

        const mediaContainer = this.element.querySelector('[data-key="media-container"]');
        if (mediaContainer) {
            mediaContainer.innerHTML = '';
        }
        this.mediaUrls = [];
    }

    getMediaUrls(): string[] {
        return [...this.mediaUrls];
    }

    setMediaUrls(urls: string[]): void {
        this.clearMediaPreviews();
        urls.forEach(url => this.addMediaPreview(url));
    }

    private setupMediaHandlers(): void {
        if (!this.element) return;

        const mediaInput = this.element.querySelector('[data-key="media-upload"]') as HTMLInputElement;
        if (!mediaInput) return;

        mediaInput.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                // Проверяем размер файлов (максимум 5 МБ)
                const maxSize = 5 * 1024 * 1024; // 5 МБ
                const validFiles: File[] = [];
                const tooLargeFiles: string[] = [];

                Array.from(files).forEach(file => {
                    if (file.size > maxSize) {
                        tooLargeFiles.push(file.name);
                    } else {
                        validFiles.push(file);
                    }
                });

                if (tooLargeFiles.length > 0) {
                    alert(`Следующие файлы превышают лимит 5 МБ: ${tooLargeFiles.join(', ')}`);
                }

                if (validFiles.length > 0) {
                    this.onMediaUpload(validFiles);
                }

                // Сбрасываем значение input для возможности повторной загрузки
                mediaInput.value = '';
            }
        });
    }
}