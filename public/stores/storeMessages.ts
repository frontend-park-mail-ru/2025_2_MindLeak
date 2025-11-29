// src/stores/storeMessages.ts

import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_MESSAGES_TYPES, ActionMessagesNewMessage } from '../actions/actionMessages';
import { Dialog } from '../models/chat';
import { Message } from '../models/message';

export interface MessagesState {
    dialogs: Dialog[];
}

export class StoreMessages extends BaseStore<MessagesState> {
    constructor() {
        super({
            dialogs: []
        });
    }

    protected registerActions(): void {

        /** Получили список диалогов */
        dispatcher.register(
            ACTION_MESSAGES_TYPES.requestMessagesSuccess,
            (payload: { dialogs: Dialog[] }) => {
                this.setState({ dialogs: payload.dialogs });
            }
        );

        /** Пришло новое сообщение по WS */
        dispatcher.register(
            ACTION_MESSAGES_TYPES.newMessage,
            (payload: ActionMessagesNewMessage) => {
                const message: Message = payload.data.message;
                if (!message) return;

                const dialogId = message.room_id;

                const dialogs = [...this.state.dialogs];

                const idx = dialogs.findIndex(d => d.id === dialogId);

                const lastMessage = message.text;
                const lastMessageTime = new Date(message.created_at).toLocaleTimeString();

                if (idx >= 0) {
                    const d = { ...dialogs[idx] };
                    d.lastMessage = lastMessage;
                    d.lastMessageTime = lastMessageTime;
                    dialogs[idx] = d;
                } else {
                    dialogs.push({
                        id: dialogId,
                        name: `Room ${dialogId}`, // Placeholder
                        avatar: message.avatar || "",
                        lastMessage,
                        lastMessageTime
                    });
                }

                this.setState({ dialogs });
            }
        );
    }
}
