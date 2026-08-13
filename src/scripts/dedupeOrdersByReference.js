require('dotenv').config();

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const orders = await Order.find({
    paystackReference: { $exists: true, $ne: '' },
  })
    .sort({ createdAt: 1 })
    .lean();

  const grouped = new Map();
  orders.forEach((order) => {
    const reference = String(order.paystackReference || '').trim();
    if (!grouped.has(reference)) {
      grouped.set(reference, []);
    }
    grouped.get(reference).push(order);
  });

  const summary = [];

  for (const [reference, group] of grouped.entries()) {
    if (group.length <= 1) continue;

    const [keep, ...duplicates] = group;
    const restoredItems = [];

    for (const duplicate of duplicates) {
      for (const item of duplicate.items || []) {
        const qty = Number(item.quantity || item.qty || 0);
        if (qty < 1) continue;

        await Product.findByIdAndUpdate(item.productId, {
          $inc: {
            inventory: qty,
            quantity: qty,
          },
        });

        restoredItems.push({
          productId: String(item.productId),
          quantity: qty,
        });
      }

      await Order.deleteOne({ _id: duplicate._id });
    }

    await Order.findByIdAndUpdate(keep._id, { finalizationStatus: 'complete' });

    summary.push({
      reference,
      keptOrderId: String(keep._id),
      deletedOrderIds: duplicates.map((order) => String(order._id)),
      restoredItems,
    });
  }

  const products = await Product.find({}, 'name inventory quantity').lean();

  console.log(JSON.stringify({
    fixedGroups: summary,
    productsAfter: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      inventory: product.inventory,
      quantity: product.quantity,
    })),
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
