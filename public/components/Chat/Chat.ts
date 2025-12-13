import { dispatcher } from '../../dispatcher/dispatcher';
import { StoreChat, ChatState } from '../../stores/storeChat';
import { ACTION_CHAT_TYPES } from '../../actions/actionChat';
import { Message } from '../../models/message';
import { renderChatMessageHTML } from '../ChatMessage/ChatMessage';

export interface ChatConfig {
    key: string;
    companionId: string;
    companionAvatar: string;
    companionName: string;
    lastDateOnline: string;
    backButtonHref: string;
    store: StoreChat; // передаём store
    myId: string | null;
    myName: string;
    myAvatar: string;
    inputKey: string;
    showEmojiPanel: boolean;
}

export class Chat {
    private _config: ChatConfig;
    private _root: HTMLElement;

    private _content!: HTMLElement;
    private _textarea!: HTMLTextAreaElement;
    private _form!: HTMLFormElement;
    private _back!: HTMLElement;

    constructor(config: ChatConfig, root: HTMLElement) {
        this._config = config;
        this._root = root;

        // подписываемся на storeChat — используем addListener как у тебя в проекте
        this._config.store.addListener(() => this.onStoreUpdate());

        // рендерим
        this.render();
        this.cacheDom();
        this.addHandlers();
        this.scrollToBottom();
    }

    /** Получаем ссылки на HTML */
    private cacheDom() {
        this._content = this._root.querySelector('.chat__content')!;
        this._textarea = this._root.querySelector(`[data-key="${this._config.inputKey}"]`)! as HTMLTextAreaElement;
        this._form = this._root.querySelector('.chat__bottom') as HTMLFormElement;
        this._back = this._root.querySelector('.chat__back-button') as HTMLElement;
    }

    /** Основной рендер */
    render() {
        const state: ChatState = this._config.store.getState();

        // Преобразуем сообщения в HTML
        const messagesHTML = state.messages
            .map((msg: Message) =>
                renderChatMessageHTML(
                    msg,
                    state.myId ?? '',
                    state.myName ?? '',
                    state.companionName ?? '',
                    state.myAvatar ?? '',
                    state.companionAvatar ?? ''
                )
            )
            .join('');

        const template = (Handlebars.templates && (Handlebars.templates['src/components/Chat/Chat.hbs'] || Handlebars.templates['Chat.hbs']))
            ? (Handlebars.templates['src/components/Chat/Chat.hbs'] || Handlebars.templates['Chat.hbs'])
            : null;

        if (template) {
            this._root.innerHTML = template({
                ...this._config,
                messages: messagesHTML,
            });
        } else {
            // fallback: простой рендер, если шаблона нет
            this._root.innerHTML = `
                <div class="chat">
                    <div class="chat__content">${messagesHTML}</div>

                    <form class="chat__bottom">
                        <textarea data-key="${this._config.inputKey}" class="chat-input"></textarea>
                        <button type="submit">Send</button>
                    </form>
                </div>
            `;
        }
    }

    /** Обновление при изменении store */
    private onStoreUpdate() {
        this.render();
        this.cacheDom();
        this.addHandlers();
        this.scrollToBottom();
    }

    /** Навешиваем обработчики */
    private addHandlers() {
        // Если элементы ещё не закешированы — кэшируем
        if (!this._form || !this._textarea || !this._back) {
            this.cacheDom();
        }

        // Отвязываем предыдущие слушатели, если нужно (простая проверка)
        // Чтобы избежать дублирования обработчиков, можно клонировать ноду или использовать флаг.
        // Здесь просто добавим обработчики — если у тебя дублируются, можно доработать.

        // отправка формы
        this._form.removeEventListener('submit', this._onFormSubmit as EventListener);
        this._form.addEventListener('submit', this._onFormSubmit as EventListener);

        // Enter → отправить
        this._textarea.removeEventListener('keydown', this._onTextareaKeydown as EventListener);
        this._textarea.addEventListener('keydown', this._onTextareaKeydown as EventListener);

        // назад
        this._back.removeEventListener('click', this._onBackClick as EventListener);
        this._back.addEventListener('click', this._onBackClick as EventListener);
    }

    private _onFormSubmit = (e: Event) => {
        e.preventDefault();
        this.sendMessage();
    };

    private _onTextareaKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    };

    private _onBackClick = (e: Event) => {
        e.preventDefault();
        window.history.back();
    };

    /** Отправка сообщения через dispatcher → WebSocket */
    private sendMessage() {
        const text = (this._textarea?.value || '').trim();
        if (!text) return;

        // Для согласованности с websocket и actionChat, передаем { message: { text } }
        dispatcher.dispatch(ACTION_CHAT_TYPES.sendMessage, { message: { text } });

        this._textarea.value = '';
    }

    /** Прокрутка вниз */
    private scrollToBottom() {
        setTimeout(() => {
            if (this._content) {
                this._content.scrollTop = this._content.scrollHeight;
            }
        }, 10);
    }

    /** Очистка подписки при уничтожении компонента */
    destroy() {
        // если в будущем addListener вернёт функцию отписки — сохрани её и вызови здесь.
        // сейчас просто ничего не делаем.
    }
}