import { StoreMessenger } from '../stores/storeMessenger';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_MESSAGES_TYPES } from '../actions/actionMessages';
import { ACTION_CHAT_TYPES } from '../actions/actionChat';

export class MessengerView {
    private root: HTMLElement;
    private store: StoreMessenger;

    constructor(rootElement: HTMLElement) {
        this.root = rootElement;

        // ❗ ВСЕГДА создаём StoreMessenger здесь
        this.store = new StoreMessenger();

        // Подписываемся на обновления
        this.store.addListener(() => this.render());

        // Загружаем список диалогов
        dispatcher.dispatch(ACTION_MESSAGES_TYPES.requestMessages);

        this.render();
    }

    render() {
        const state = this.store.getState();

        // Защита от null/undefined
        const dialogs = Array.isArray(state.dialogs) ? state.dialogs : [];
        const messages = Array.isArray(state.messages) ? state.messages : [];

        const dialogsHTML = dialogs
            .map(d => `
            <div class="dialog-item" data-id="${d.id}">
                <div class="dialog-avatar" style="background-image:url('${d.avatar ?? ''}')"></div>
                <div class="dialog-name">${d.name}</div>
            </div>
            `)
            .join('');

        const messagesHTML = messages
            .map(m => `
            <div class="msg ${m.user_id === state.myId ? 'me' : 'other'}">
                <img class="msg-avatar" src="${m.avatar}">
                <div class="msg-text">${m.text}</div>
                <span class="msg-time">${m.created_at}</span>
            </div>
            `)
            .join('');

        this.root.innerHTML = `
            <div class="messenger">
                <div class="dialogs">${dialogsHTML}</div>

                <div class="chat">
                    ${
                        state.currentRoomId
                            ? `
                        <div class="messages">${messagesHTML}</div>

                        <div class="input">
                            <input id="msgInput" placeholder="Сообщение..." />
                            <button id="sendBtn">➤</button>
                        </div>
                        `
                            : `<div class="empty">Выберите чат</div>`
                    }
                </div>
            </div>
        `;

        this.bind();
        return this.root.firstElementChild as HTMLElement;
    }

    private bind() {
        // выбор диалога
        this.root.querySelectorAll('.dialog-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = Number(el.getAttribute('data-id'));

                dispatcher.dispatch(ACTION_CHAT_TYPES.goToChat, { id });
                dispatcher.dispatch(ACTION_CHAT_TYPES.requestChat, { id });
            });
        });

        const input = this.root.querySelector('#msgInput') as HTMLInputElement;
        const btn = this.root.querySelector('#sendBtn') as HTMLButtonElement;

        if (btn && input) {
            btn.onclick = () => {
                const text = input.value.trim();
                if (!text) return;

                dispatcher.dispatch(ACTION_CHAT_TYPES.sendMessage, {
                    data: { text }
                });

                input.value = '';
            };
        }
    }
}