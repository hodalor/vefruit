const express = require('express');

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const farmersRoutes = require('./farmers.routes');
const productsRoutes = require('./products.routes');
const categoriesRoutes = require('./categories.routes');
const ordersRoutes = require('./orders.routes');
const heroRoutes = require('./hero.routes');
const healthRoutes = require('./health.routes');
const paymentRoutes = require('./payment.routes');
const eventsRoutes = require('./events.routes');
const chatsRoutes = require('./chats.routes');
const requestsRoutes = require('./requests.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/farmers', farmersRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders', ordersRoutes);
router.use('/hero-slides', heroRoutes);
router.use('/health', healthRoutes);
router.use('/payments', paymentRoutes);
router.use('/events', eventsRoutes);
router.use('/chats', chatsRoutes);
router.use('/requests', requestsRoutes);

module.exports = router;
