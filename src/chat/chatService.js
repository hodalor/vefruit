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
  if (params.threadKey) query.set('threadKey', params.threadKey);
  if (params.join) query.set('join', 'true');
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

export function buildThreadKey({ buyerId, farmerId, productId }) {
  const safeBuyerId = String(buyerId || '').trim();
  const safeFarmerId = String(farmerId || '').trim();
  const safeProductId = String(productId || '').trim();
  if (!safeBuyerId || !safeFarmerId) return '';
  return ['thread', [safeBuyerId, safeFarmerId].sort().join('-'), safeProductId || 'general'].join(':');
}
