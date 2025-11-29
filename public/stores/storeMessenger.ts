// src/stores/storeMessenger.ts

import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_MESSAGES_TYPES } from '../actions/actionMessages';
import { ACTION_CHAT_TYPES } from '../actions/actionChat';
import { Dialog } from '../models/chat';
import { Message } from '../models/message';
import { ajax } from '../modules/ajax';
import { loginStore } from './storeLogin';

export interface MessengerState {
    dialogs: Dialog[];
    currentRoomId: string | null;
    messages: Message[];
    myId: string | null;
}

export class StoreMessenger extends BaseStore<MessengerState> {
    constructor() {
        super({
            dialogs: [],
            currentRoomId: null,
            messages: [],
            myId: loginStore.getState().user?.id || null
        });
    }

    protected registerActions(): void {

        /** Загрузка списка комнат */
        this.registerAction(ACTION_MESSAGES_TYPES.requestMessages, async () => {
            const res = await ajax.get('/chat/rooms');

            if (res.status === 200) {
                this.setState({ dialogs: res.data });
            } else {
                console.error('Ошибка загрузки комнат', res);
            }
        });

        /** Пользователь выбрал комнату */
        this.registerAction(ACTION_CHAT_TYPES.goToChat, async (payload) => {
            const id = payload.data.id;
            this.setState({ currentRoomId: id, messages: [] });

            const res = await ajax.get(`/chat/rooms/${id}/messages`);

            if (res.status === 200) {
                this.setState({ messages: res.data });
            } else {
                console.error('Ошибка загрузки сообщений', res);
            }
        });

        /** WebSocket новое сообщение */
        this.registerAction(ACTION_MESSAGES_TYPES.newMessage, (payload) => {
            const message: Message = payload.data.message;
            if (!message) return;

            this.setState({
                messages: [...this.state.messages, message]
            });
        });
    }
}
