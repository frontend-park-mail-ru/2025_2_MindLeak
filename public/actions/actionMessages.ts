// src/actions/actionMessages.ts

import { Dialog } from '../models/chat';
import { Message } from '../models/message';
import { Action, ActionType } from './action';

export const ACTION_MESSAGES_TYPES = {
    goToMessages: 'goToMessages',
    updateMessages: 'updateMessages',
    requestMessages: 'actionMessagesRequest',
    requestMessagesSuccess: 'actionMessagesRequestSuccess',
    requestMessagesFail: 'actionMessagesRequestFail',
    newMessage: 'actionMessagesNewMessage',
    sendMessage: 'actionMessagesSendMessage',
    goToChat: 'goToChat',
};

// === Экшены ===

export class ActionMessagesRequest implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.requestMessages;
    data = {};
}

export class ActionMessagesRequestSuccess implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.requestMessagesSuccess;
    data: { dialogs: Dialog[] };

    constructor(dialogs: Dialog[]) {
        this.data = { dialogs };
    }
}

export class ActionMessagesRequestFail implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.requestMessagesFail;
    data: { status: number; message?: string };

    constructor(status: number, message?: string) {
        this.data = { status, message };
    }
}

export class ActionMessagesNewMessage implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.newMessage;
    data: { message: Message };

    constructor(message: Message) {
        this.data = { message };
    }
}

export class ActionMessagesSendMessage implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.sendMessage;
    data: { text: string };

    constructor(text: string) {
        this.data = { text };
    }
}

export class ActionGoToChat implements Action {
    type: ActionType = ACTION_MESSAGES_TYPES.goToChat;
    data: { id: string };

    constructor(id: string) {
        this.data = { id };
    }
}