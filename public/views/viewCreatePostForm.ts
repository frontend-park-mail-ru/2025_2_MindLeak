import { loginStore } from '../stores/storeLogin';
import { dispatcher } from '../dispatcher/dispatcher';
import { createPostStore, CreatePostState } from '../stores/storeCreatePostForm';
import { SidebarMenu, SECONDARY_MENU_ITEMS } from '../components/SidebarMenu/SidebarMenu';
import { selectTheme, createPost, updatePostContent, editPost } from '../actions/actionsCreatePostForm';

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
    constructor(private onSelect: (key: string) => void) {}

    async render(): Promise<HTMLElement> {
        const div = document.createElement('div');
        div.className = 'theme-selector-popup';

        const sidebarMenu = new SidebarMenu(
            SECONDARY_MENU_ITEMS,
            '',
            (key) => {
                this.onSelect(key);
                this.close();
            }
        );

        const menuEl = await sidebarMenu.render();
        menuEl.classList.add('theme-selector-popup__menu');
        div.appendChild(menuEl);

        document.addEventListener('click', (e) => {
            if (!div.contains(e.target as Node)) this.close();
        }, { once: true });

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

    constructor() {
        this.boundStoreHandler = this.handleStoreChange.bind(this);
        createPostStore.addListener(this.boundStoreHandler);
    }

    private handleStoreChange(): void {
        const state = createPostStore.getState();

        if (state.success) {
            this.close();
            dispatcher.dispatch('SHOW_NOTIFICATION', {
                type: 'success',
                message: 'Пост успешно опубликован!'
            });
        }

        if (state.error) {
            this.showError(state.error);
        }

        this.updateUIFromState(state);
    }

    private updateUIFromState(state: CreatePostState): void {
        if (!this.formElement) return;

        const submitBtn = this.formElement.querySelector('[data-key="submit-post"]') as HTMLButtonElement;
        if (submitBtn) {
            submitBtn.disabled = state.isCreating;
            submitBtn.textContent = state.isCreating ? 'Публикация...' : 'Опубликовать';
        }

        const subtitle = this.formElement.querySelector('.user-menu__subtitle');
        if (subtitle) subtitle.textContent = state.currentTheme;

        const themeBtn = this.formElement.querySelector('[data-key="select-theme"]');
        if (themeBtn) {
            themeBtn.textContent = state.currentThemeKey ? 'Сменить тему' : 'Выбрать тему';
            themeBtn.classList.toggle('theme-button--selected', !!state.currentThemeKey);
        }

        const textarea = this.formElement.querySelector('[data-key="post-content"]') as HTMLTextAreaElement;
        const titleInput = this.formElement.querySelector('[data-key="post-title"]') as HTMLInputElement;

        if (textarea) textarea.value = state.draftContent;
        if (titleInput) titleInput.value = state.draftTitle;

        const charCounter = this.formElement.querySelector('.char-counter__number');
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
            avatar: auth.user?.avatar || '/img/defaultAvatar.jpg'
        };

        const html = template(props);
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        this.formElement = div.firstElementChild as HTMLElement;
        this.formElement.classList.add('create-post-form--modal');

        this.setupEventHandlers();
        this.updateUIFromState(state);
        return this.formElement;
    }

    private setupEventHandlers(): void {
        if (!this.formElement) return;

        const overlay = this.formElement.querySelector('[data-key="overlay"]');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        const form = this.formElement.querySelector('[data-key="create-post-form"]') as HTMLFormElement;
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const state = createPostStore.getState();
            const fd = new FormData(form);
            const data = {
                title: fd.get('title') as string,
                content: fd.get('content') as string,
                theme: state.currentThemeKey
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
            const popup = new ThemeSelectorPopup((key) => {
                const item = SECONDARY_MENU_ITEMS.find(i => i.key === key);
                if (item) selectTheme(item.text, key);
            });
            await popup.render();
        });
    }

    close(): void {
        if (this.formElement?.parentNode) {
            this.formElement.remove();
            this.formElement = null;
        }
        dispatcher.dispatch('CREATE_POST_FORM_INIT');
        this.destroy();
    }

    destroy(): void {
        createPostStore.removeListener(this.boundStoreHandler);
    }
}