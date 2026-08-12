import { useEffect } from 'react';
import { api } from '../api/client';

const eventMap = {
  'product.changed': 'vefruit-products-changed',
  'category.changed': 'vefruit-categories-changed',
  'order.changed': 'vefruit-orders-changed',
  'hero.changed': 'vefruit-hero-changed',
  'user.changed': 'vefruit-users-changed',
  'farmer.changed': 'vefruit-farmers-changed',
  'chat.changed': 'vefruit-chat-changed',
  'request.changed': 'vefruit-requests-changed',
};

export default function useRealtimeBridge() {
  useEffect(() => {
    const streamUrl = `${api.baseUrl}/events/stream`;
    const source = new EventSource(streamUrl);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data || '{}');
        const name = eventMap[data.event];
        if (name) {
          window.dispatchEvent(new Event(name));
        }
      } catch {}
    };

    return () => {
      source.close();
    };
  }, []);
}
