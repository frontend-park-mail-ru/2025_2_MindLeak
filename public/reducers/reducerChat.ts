// src/reducers/reducerChat.ts

import { ACTION_CHAT_TYPES } from '../actions/actionChat';
import { ACTION_MESSAGES_TYPES } from '../actions/actionMessages';
import { Message } from '../models/message';

export interface ChatState {
  companionId: string | null;
  companionAvatar?: string;
  companionName?: string;
  backButtonHref?: string;

  messages: Message[];

  myId: string | null;
  myName?: string;
  myAvatar?: string;

  inputText?: string;
  inputKey?: string;

  showEmojiPanel?: boolean;
  emojiPanelSelected?: string | null;
}

export const initialChatState = (): ChatState => ({
  companionId: null,
  companionAvatar: '',
  companionName: '',
  backButtonHref: '',

  messages: [],

  myId: null,
  myName: '',
  myAvatar: '',

  inputText: '',
  inputKey: 'chat-input',

  showEmojiPanel: false,
  emojiPanelSelected: null,
});

export function reducerChat(state: ChatState = initialChatState(), action: any): ChatState {
  switch (action.type) {

    /** Подгрузили историю чата через REST */
    case ACTION_CHAT_TYPES.requestChatSuccess: {
      const messages: Message[] =
        action.data?.messagesResponse ? action.data.messagesResponse : [];
      return { ...state, messages };
    }

    /** Новое сообщение пришло по WebSocket */
    case ACTION_MESSAGES_TYPES.newMessage: {
      const m: Message | undefined = action.data?.message;
      if (!m) return state;
      return {
        ...state,
        messages: [...state.messages, m],
      };
    }

    /** Пользователь отправляет сообщение (optimistic UI) */
    case ACTION_CHAT_TYPES.sendMessage: {
      const text = action.data?.message?.text;
      if (!text || !state.myId || !state.companionId) return state;

      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        room_id: state.companionId,
        user_id: state.myId,
        avatar: state.myAvatar || '',
        text: text,
        created_at: new Date().toISOString(),
      };

      return {
        ...state,
        messages: [...state.messages, optimistic],
      };
    }

    default:
      return state;
  }
}