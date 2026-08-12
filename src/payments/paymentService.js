import { api } from '../api/client';

export async function getPaymentConfig() {
  const data = await api.get('/payments/config');
  return data;
}

export async function initializePayment(payload) {
  const data = await api.post('/payments/initialize', payload);
  return data.data;
}

export async function verifyPayment(reference) {
  const data = await api.get(`/payments/verify/${encodeURIComponent(reference)}`);
  return data.data;
}
