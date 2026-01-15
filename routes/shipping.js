const express = require('express');
const router = express.Router();

const ShippingController = require('../controllers/ShippingController');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// Public routes for shipping calculation
router.post('/calculate', ShippingController.calculateShippingCost);

// Admin routes - require authentication and admin access
router.use(verifyToken, verifyAdmin);

// Shipping rates routes
router.get('/rates', ShippingController.getShippingRates);
router.post('/rates', ShippingController.createShippingRate);
router.put('/rates/:id', ShippingController.updateShippingRate);
router.patch('/rates/:id/toggle', ShippingController.toggleShippingRateStatus);
router.delete('/rates/:id', ShippingController.deleteShippingRate);

// Shipping zones routes
router.get('/zones', ShippingController.getShippingZones);
router.post('/zones', ShippingController.createShippingZone);
router.put('/zones/:id', ShippingController.updateShippingZone);
router.delete('/zones/:id', ShippingController.deleteShippingZone);

// Shiprocket integration routes
router.post('/shiprocket/integration', ShippingController.saveShiprocketIntegration);
router.get('/shiprocket/integration', ShippingController.getShiprocketIntegration);
router.get('/shiprocket/status', ShippingController.checkShiprocketStatus);

module.exports = router;