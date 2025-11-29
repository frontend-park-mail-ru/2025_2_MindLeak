// src/stores/storeChat.ts

import { BaseStore } from './store';
import { dispatcher } from '../dispatcher/dispatcher';
import { ACTION_CHAT_TYPES } from '../actions/actionChat';
import { ACTION_MESSAGES_TYPES, ActionMessagesNewMessage } from '../actions/actionMessages';
import { Message } from '../models/message';

export interface ChatState {
    companionId: string | null;

    myId: string | null;
    myName?: string;
    myAvatar?: string;

    companionName?: string;
    companionAvatar?: string;

    messages: Message[];
    inputText: string;
}

export class StoreChat extends BaseStore<ChatState> {
    constructor() {
        super({
            companionId: null,

            myId: null,
            myName: 'Вы',
            myAvatar: '',

            companionName: '',
            companionAvatar: '',

            messages: [],
            inputText: ''
        });
    }

    protected registerActions(): void {

        /** Открыли чат */
        dispatcher.register(
            ACTION_CHAT_TYPES.goToChat,
            (payload: { id: string }) => {
                this.setState({
                    companionId: payload.id,
                    messages: []
                });
            }
        );

        /** Загрузили историю сообщений */
        dispatcher.register(
            ACTION_CHAT_TYPES.requestChatSuccess,
            (payload: { messages: Message[] }) => {
                this.setState({ messages: payload.messages });
            }
        );

        /** Оптимистичная отправка сообщения */
        dispatcher.register(
            ACTION_CHAT_TYPES.sendMessage,
            (payload: { message: { text: string } }) => {
                const old = this.state.messages;

                if (!this.state.myId || !this.state.companionId) return;

                const optimistic: Message = {
                    id: `optim-${Date.now()}`,
                    room_id: this.state.companionId,
                    user_id: this.state.myId,
                    avatar: this.state.myAvatar || "",
                    text: payload.message.text,
                    created_at: new Date().toISOString()
                };

                this.setState({
                    messages: [...old, optimistic]
                });
            }
        );

        /** Пришло новое сообщение по WS */
        dispatcher.register(
            ACTION_MESSAGES_TYPES.newMessage,
            (payload: ActionMessagesNewMessage) => {
                const message: Message = payload.data.message;

                if (!message) return;

                // Добавляем сообщение только если чат открыт и это сообщение для него
                if (
                    this.state.companionId === message.room_id ||
                    message.user_id === this.state.myId
                ) {
                    const old = this.state.messages;
                    this.setState({ messages: [...old, message] });
                }
            }
        );
    }
}
