const express = require('express');
const router = express.Router();

const { AnalyticsController } = require('../controllers');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// All analytics routes require admin access
router.use(verifyToken, verifyAdmin);

// Dashboard analytics
router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

// Sales analytics
router.get('/sales', AnalyticsController.getSalesAnalytics);

// Customer analytics
router.get('/customers', AnalyticsController.getCustomerAnalytics);

module.exports = router;