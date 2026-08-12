const express = require('express');

const ChatMessage = require('../models/ChatMessage');
const { serializeChatMessage } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

router.get('/', async (req, res) => {
  const { currentUserId, otherUserId, productId } = req.query;
  const query = {};

  if (productId) query.productId = productId;
  if (currentUserId && otherUserId) {
    query.$or = [
      { senderId: currentUserId, recipientId: otherUserId },
      { senderId: otherUserId, recipientId: currentUserId },
    ];
  } else if (currentUserId) {
    query.$or = [{ senderId: currentUserId }, { recipientId: currentUserId }];
  }

  const messages = await ChatMessage.find(query).sort({ createdAt: 1 });
  res.json({ success: true, messages: messages.map(serializeChatMessage) });
});

router.post('/', async (req, res) => {
  const { senderId, senderRole, recipientId, recipientRole, productId, body } = req.body;
  if (!senderId || !recipientId || !String(body || '').trim()) {
    return res.status(400).json({ success: false, message: 'Sender, recipient, and message are required' });
  }

  const message = await ChatMessage.create({
    senderId,
    senderRole: senderRole || 'buyer',
    recipientId,
    recipientRole: recipientRole || 'farmer',
    productId: productId || null,
    body: String(body).trim(),
  });

  const serialized = serializeChatMessage(message);
  publishRealtimeEvent('chat.changed', {
    participants: [serialized.senderId, serialized.recipientId],
    productId: serialized.productId,
  });

  res.status(201).json({ success: true, message: serialized });
});

module.exports = router;
