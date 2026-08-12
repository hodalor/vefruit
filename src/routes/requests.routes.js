const express = require('express');

const ProduceRequest = require('../models/ProduceRequest');
const { serializeProduceRequest } = require('../utils/serializers');
const { publishRealtimeEvent } = require('../utils/realtime');

const router = express.Router();

router.get('/', async (req, res) => {
  const query = {};
  if (req.query.buyerId) query.buyerId = req.query.buyerId;
  if (req.query.status) query.status = String(req.query.status).trim().toLowerCase();
  const requests = await ProduceRequest.find(query).sort({ createdAt: -1 });
  res.json({ success: true, requests: requests.map(serializeProduceRequest) });
});

router.post('/', async (req, res) => {
  const { buyerId, buyerName, buyerPhone, desiredProduct, category, quantity, neededBy, location, note } = req.body;
  if (!buyerId || !buyerName || !desiredProduct) {
    return res.status(400).json({ success: false, message: 'Buyer and requested product are required' });
  }

  const request = await ProduceRequest.create({
    buyerId,
    buyerName,
    buyerPhone: buyerPhone || '',
    desiredProduct: String(desiredProduct).trim(),
    category: String(category || '').trim().toLowerCase(),
    quantity: Number(quantity) || 1,
    neededBy: neededBy || '',
    location: location || '',
    note: note || '',
    status: 'open',
  });

  const serialized = serializeProduceRequest(request);
  publishRealtimeEvent('request.changed', { buyerId: serialized.buyerId, status: serialized.status });
  res.status(201).json({ success: true, request: serialized });
});

router.patch('/:id', async (req, res) => {
  const payload = { ...req.body };
  if (payload.category !== undefined) payload.category = String(payload.category || '').trim().toLowerCase();
  if (payload.status !== undefined) payload.status = String(payload.status || '').trim().toLowerCase();
  const request = await ProduceRequest.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  const serialized = serializeProduceRequest(request);
  publishRealtimeEvent('request.changed', { buyerId: serialized.buyerId, status: serialized.status });
  res.json({ success: true, request: serialized });
});

module.exports = router;
