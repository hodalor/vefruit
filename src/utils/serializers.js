function serializeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  return {
    id: String(obj._id || obj.id),
    name: obj.name || '',
    phone: obj.phone || '',
    email: obj.email || '',
    address: obj.address || '',
    idType: obj.idType || '',
    idNumber: obj.idNumber || '',
    role: obj.role,
    approved: obj.role === 'farmer' ? !!obj.approved : true,
    status: obj.role === 'farmer' ? obj.status : 'approved',
    businessName: obj.businessName || '',
    businessAddress: obj.businessAddress || '',
    businessPhone: obj.businessPhone || '',
    registrationNumber: obj.registrationNumber || '',
    bankName: obj.bankName || '',
    branchName: obj.branchName || '',
    branchCode: obj.branchCode || '',
    accountName: obj.accountName || '',
    accountNumber: obj.accountNumber || '',
    mobileMoneyNumber: obj.mobileMoneyNumber || '',
    mobileMoneyMtnName: obj.mobileMoneyMtnName || '',
    isVerified: obj.isVerified !== false,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function serializeProduct(product) {
  const obj = product.toObject ? product.toObject() : product;
  return {
    id: String(obj._id || obj.id),
    name: obj.name,
    description: obj.description || '',
    price: obj.price || 0,
    quantity: obj.quantity ?? obj.inventory ?? 0,
    inventory: obj.inventory ?? obj.quantity ?? 0,
    category: obj.category || '',
    image: obj.image || '',
    images: obj.images || [],
    sellerId: obj.sellerId ? String(obj.sellerId) : null,
    tags: obj.tags || [],
    availability: obj.availability || 'available',
    location: obj.location || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function serializeOrder(order) {
  const obj = order.toObject ? order.toObject() : order;
  return {
    id: String(obj._id || obj.id),
    buyerId: obj.buyerId ? String(obj.buyerId) : null,
    items: (obj.items || []).map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
      qty: item.quantity,
      price: item.price,
      sellerId: item.sellerId ? String(item.sellerId) : null,
    })),
    totalAmount: obj.totalAmount || 0,
    paymentStatus: obj.paymentStatus || 'pending',
    orderStatus: obj.orderStatus || 'processing',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    neededBy: obj.neededBy || '',
    requestNote: obj.requestNote || '',
    paystackReference: obj.paystackReference || '',
  };
}

function serializeHeroSlide(slide) {
  const obj = slide.toObject ? slide.toObject() : slide;
  return {
    id: String(obj._id || obj.id),
    title: obj.title,
    image: obj.image,
    cta: obj.cta || { text: '', href: '/' },
    order: obj.order || 0,
  };
}

module.exports = {
  serializeUser,
  serializeProduct,
  serializeOrder,
  serializeHeroSlide,
};
