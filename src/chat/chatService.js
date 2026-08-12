import { api } from '../api/client';

const CHAT_EVENT = 'vefruit-chat-changed';

function emitChatChange() {
  window.dispatchEvent(new Event(CHAT_EVENT));
}

export async function loadChatMessages(params = {}) {
  const query = new URLSearchParams();
  if (params.currentUserId) query.set('currentUserId', params.currentUserId);
  if (params.otherUserId) query.set('otherUserId', params.otherUserId);
  if (params.productId) query.set('productId', params.productId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await api.get(`/chats${suffix}`);
  return data.messages || [];
}

export async function sendChatMessage(payload) {
  const data = await api.post('/chats', payload);
  emitChatChange();
  return data.message;
}

export function getChatEventName() {
  return CHAT_EVENT;
}
