const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, trim: true, default: 'buyer' },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientRole: { type: String, trim: true, default: 'farmer' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    threadKey: { type: String, trim: true, default: '' },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
