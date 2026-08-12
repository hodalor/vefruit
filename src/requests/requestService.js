import { api } from '../api/client';

const REQUEST_EVENT = 'vefruit-requests-changed';

function emitRequestChange() {
  window.dispatchEvent(new Event(REQUEST_EVENT));
}

export async function loadRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.buyerId) query.set('buyerId', params.buyerId);
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await api.get(`/requests${suffix}`);
  return data.requests || [];
}

export async function createRequest(payload) {
  const data = await api.post('/requests', payload);
  emitRequestChange();
  return data.request;
}

export async function updateRequest(id, patch) {
  const data = await api.patch(`/requests/${id}`, patch);
  emitRequestChange();
  return data.request;
}

export function getRequestEventName() {
  return REQUEST_EVENT;
}
