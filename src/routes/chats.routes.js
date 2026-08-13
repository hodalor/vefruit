const express = require('express');

const ChatMessage = require('../models/ChatMessage');
const { serializeChatMessage } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

function uniqueIds(values = []) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

router.get('/', async (req, res) => {
  const { currentUserId, otherUserId, productId, threadKey } = req.query;
  const query = {};

  if (threadKey) {
    query.threadKey = String(threadKey);
    if (currentUserId) {
      query.participantIds = currentUserId;
    }
  } else {
    if (productId) query.productId = productId;
    if (currentUserId && otherUserId) {
      query.$or = [
        { senderId: currentUserId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: currentUserId },
      ];
    } else if (currentUserId) {
      query.$or = [{ senderId: currentUserId }, { recipientId: currentUserId }, { participantIds: currentUserId }];
    }
  }

  const messages = await ChatMessage.find(query).sort({ createdAt: 1 });
  res.json({ success: true, messages: messages.map(serializeChatMessage) });
});

router.post('/', async (req, res) => {
  const { senderId, senderRole, recipientId, recipientRole, productId, body, threadKey, participantIds } = req.body;
  if (!senderId || !recipientId || !String(body || '').trim()) {
    return res.status(400).json({ success: false, message: 'Sender, recipient, and message are required' });
  }

  const participantList = uniqueIds([...(participantIds || []), senderId, recipientId]);
  const message = await ChatMessage.create({
    senderId,
    senderRole: senderRole || 'buyer',
    recipientId,
    recipientRole: recipientRole || 'farmer',
    productId: productId || null,
    threadKey: String(threadKey || '').trim(),
    participantIds: participantList,
    body: String(body).trim(),
  });

  const serialized = serializeChatMessage(message);
  publishRealtimeEvent('chat.changed', {
    participants: serialized.participantIds.length ? serialized.participantIds : [serialized.senderId, serialized.recipientId],
    productId: serialized.productId,
    threadKey: serialized.threadKey,
  });

  res.status(201).json({ success: true, message: serialized });
});

module.exports = router;
