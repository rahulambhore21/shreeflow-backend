const express = require('express');
const router = express.Router();

const { PaymentController } = require('../controllers');
const { validatePaymentOrder, validatePaymentVerification, sanitizeInput } = require('../middlewares/validation');

// Apply sanitization to all routes
router.use(sanitizeInput);

// Create Razorpay order
router.post('/create-order', validatePaymentOrder, PaymentController.create_razorpay_order);

// Verify Razorpay payment
router.post('/verify-payment', validatePaymentVerification, PaymentController.verify_razorpay_payment);

module.exports = router;