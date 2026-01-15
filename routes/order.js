const express = require('express');
const router = express.Router();

const { OrderController } = require('../controllers');
const { validateGuestOrder, validateOrderTracking } = require('../middlewares/validation');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// Public routes
// Create order for guest customers
router.post('/', validateGuestOrder, OrderController.create_order);

// Get order by email and phone for order tracking
router.get('/track', validateOrderTracking, OrderController.get_order_by_contact);

// Admin routes (protected)
// Get all orders
router.get('/admin/all', verifyToken, verifyAdmin, OrderController.get_all_orders);

// Get order analytics
router.get('/admin/analytics', verifyToken, verifyAdmin, OrderController.get_order_analytics);

// Update order status
router.put('/admin/:id/status', verifyToken, verifyAdmin, OrderController.update_order_status);

// Shiprocket integration routes
router.post('/admin/:orderId/shipment', verifyToken, verifyAdmin, OrderController.createShipment);
router.get('/admin/:orderId/track', verifyToken, verifyAdmin, OrderController.trackShipment);
router.get('/admin/shiprocket/status', verifyToken, verifyAdmin, OrderController.checkShiprocketStatus);

module.exports = router;