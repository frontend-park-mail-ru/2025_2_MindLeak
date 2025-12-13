// src/components/ChatMessage/ChatMessage.ts
import { Message } from '../../models/message';

export function renderChatMessageHTML(
  msg: Message,
  myId: string,
  myName: string,
  companionName: string,
  myAvatar?: string,
  companionAvatar?: string,
): string {
  const isAuthor = msg.user_id === myId;
  const name = isAuthor ? (myName || 'Вы') : (companionName || 'Собеседник');
  const avatar = isAuthor ? (myAvatar || msg.avatar || '') : (companionAvatar || msg.avatar || '');
  const time = new Date(msg.created_at).toLocaleTimeString();

  const text = msg.text ? escapeHtml(msg.text) : '';

  return `
    <div class="chat-message ${isAuthor ? 'chat-message_my' : 'chat-message_incoming'}">
      <div class="chat-message__avatar">
        <img class="avatar" src="${avatar}" alt="">
      </div>
      <div class="chat-message__content">
        <div class="chat-message__name">
          <span class="chat-message__author">${name}</span>
          <span class="chat-message__date date">${time}</span>
        </div>
        <div class="chat-message__text">${text}</div>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
}