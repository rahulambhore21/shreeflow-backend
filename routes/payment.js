const express = require('express');
const router = express.Router();

const { PaymentController } = require('../controllers');

// Create Razorpay order
router.post('/create-order', PaymentController.create_razorpay_order);

// Verify Razorpay payment
router.post('/verify-payment', PaymentController.verify_razorpay_payment);

module.exports = router;