// src/actions/actionChat.ts

import { Message } from '../models/message';
import { Action, ActionType } from './action';

export const ACTION_CHAT_TYPES = {
    goToChat: 'goToChat',
    updateChat: 'updateChat',
    requestChat: 'ActionChatRequest',
    requestChatSuccess: 'ActionChatRequestSuccess',
    requestChatFail: 'ActionChatRequestFail',
    sendMessage: 'ActionChatSendMessage',
};

// === Экшены ===

export class ActionGoToChat implements Action {
    type: ActionType = ACTION_CHAT_TYPES.goToChat;
    data: { id: string };

    constructor(id: string) {
        this.data = { id };
    }
}

export class ActionUpdateChat implements Action {
    type: ActionType = ACTION_CHAT_TYPES.updateChat;
    data = {};
}

export class ActionChatRequest implements Action {
    type: ActionType = ACTION_CHAT_TYPES.requestChat;
    data: { id: string; lastTime?: string };

    constructor(id: string, lastTime?: string) {
        this.data = { id, lastTime };
    }
}

export class ActionChatRequestSuccess implements Action {
    type: ActionType = ACTION_CHAT_TYPES.requestChatSuccess;
    data: { messages: Message[] };

    constructor(messages: Message[]) {
        this.data = { messages };
    }
}

export class ActionChatRequestFail implements Action {
    type: ActionType = ACTION_CHAT_TYPES.requestChatFail;
    data = {};
}

// === Отправка сообщения через WebSocket ===
export class ActionChatSendMessage implements Action {
    type: ActionType = ACTION_CHAT_TYPES.sendMessage;
    data: { text: string };

    constructor(text: string) {
        this.data = { text };
    }
}
