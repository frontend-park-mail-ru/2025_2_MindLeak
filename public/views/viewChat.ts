// src/views/chat/viewChat.ts
import { StoreChat } from '../stores/storeChat';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_CHAT_TYPES } from '../actions/actionChat';
import { renderChatMessageHTML } from '../components/ChatMessage/ChatMessage';

export class ViewChat {
    private root: HTMLElement;
    private store: StoreChat;

    constructor(rootSelector: HTMLElement, store: StoreChat) {
        this.root = rootSelector;
        this.store = store;

        this.store.addListener(() => this.render());
        this.render();
    }

    render() {
        const state = this.store.getState();

        const htmlMessages = state.messages
            .map(msg =>
                renderChatMessageHTML(
                    {
                        id: msg.id,
                        text: msg.text,
                        avatar: msg.avatar,
                        created_at: msg.created_at,
                        user_id: msg.user_id,
                        room_id: msg.room_id,
                    },
                    state.myId,
                    state.myName,
                    state.companionName,
                    state.myAvatar,
                    state.companionAvatar
                )
            )
            .join('');

        this.root.innerHTML = `
            <div class="chat">
                <div class="chat__content">${htmlMessages}</div>

                <form class="chat__bottom">
                    <textarea class="chat-input"></textarea>
                    <button type="submit">Send</button>
                </form>
            </div>
        `;

        this.bind();
    }

    private bind() {
        const form = this.root.querySelector('.chat__bottom') as HTMLFormElement;
        const textarea = form.querySelector('textarea') as HTMLTextAreaElement;

        form.addEventListener('submit', e => {
            e.preventDefault();

            const text = textarea.value.trim();
            if (!text) return;

            dispatcher.dispatch(ACTION_CHAT_TYPES.sendMessage, {
                payload: { text }
            });

            textarea.value = '';
        });
    }
}