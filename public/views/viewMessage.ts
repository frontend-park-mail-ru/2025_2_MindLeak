// src/views/messages/viewMessages.ts
import { StoreMessages } from '../stores/storeMessages';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_MESSAGES_TYPES } from '../actions/actionMessages';
import { ACTION_CHAT_TYPES } from '../actions/actionChat';

export class ViewMessages {
    private root: HTMLElement;
    private store: StoreMessages;

    constructor(rootSelector: HTMLElement, store: StoreMessages) {
        this.root = rootSelector;
        this.store = store;

        this.store.addListener(() => this.render());
        dispatcher.dispatch(ACTION_MESSAGES_TYPES.requestMessages);

        this.render();
    }

    render() {
        const state = this.store.getState();

        const dialogs = state.dialogs
            .map(
                d => `
                <div class="dialog-item" data-id="${d.id}">
                    <img src="${d.avatar ?? ''}" class="dialog-avatar">
                    
                    <div class="dialog-info">
                        <div class="dialog-top">
                            <span class="dialog-name">${d.name}</span>
                            <span class="dialog-time">${d.lastMessageTime ?? ''}</span>
                        </div>
                        <div class="dialog-last">${d.lastMessage ?? ''}</div>
                    </div>
                </div>
            `
            )
            .join('');

        this.root.innerHTML = `<div class="dialogs-list">${dialogs}</div>`;
        this.bind();
    }

    private bind() {
        this.root.querySelectorAll('.dialog-item').forEach(item => {
            item.addEventListener('click', () => {
                const dialogId = item.getAttribute('data-id')!;
                dispatcher.dispatch(ACTION_CHAT_TYPES.goToChat, { id: dialogId });
            });
        });
    }
}
