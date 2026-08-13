require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const orders = await Order.find({
    paystackReference: { $exists: true, $ne: '' },
    $or: [
      { finalizationStatus: 'processing' },
      { finalizationStatus: 'failed' },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  console.log(JSON.stringify(
    orders.map((order) => ({
      id: String(order._id),
      ref: order.paystackReference,
      finalizationStatus: order.finalizationStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      items: Array.isArray(order.items) ? order.items.length : 0,
      totalAmount: order.totalAmount,
      updatedAt: order.updatedAt,
      finalizationError: order.finalizationError || '',
    })),
    null,
    2
  ));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
