const express = require('express');
const router = express.Router();

const ShiprocketController = require('../controllers/ShiprocketController');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// All Shiprocket routes require admin access
router.use(verifyToken, verifyAdmin);

// Get shipping rates
router.get('/rates', ShiprocketController.getShippingRates);

// Create shipping order
router.post('/orders', ShiprocketController.createShippingOrder);

// Track shipment
router.get('/track/:awb', ShiprocketController.trackShipment);

// Get pickup locations
router.get('/pickup-locations', ShiprocketController.getPickupLocations);

// Get available couriers
router.get('/couriers', ShiprocketController.getAvailableCouriers);

// Cancel shipment
router.post('/cancel', ShiprocketController.cancelShipment);

// Generate invoice
router.get('/invoice/:order_id', ShiprocketController.generateInvoice);

module.exports = router;