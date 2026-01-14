const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PaymentController = {

    /* Create Razorpay order */
    async create_razorpay_order(req, res) {
        try {
            const { amount, currency = 'INR', receipt, notes } = req.body;

            // Validate required fields
            if (!amount) {
                return res.status(400).json({
                    type: "error",
                    message: "Amount is required"
                });
            }

            // Create order options
            const options = {
                amount: amount * 100, // Amount in paisa (multiply by 100)
                currency: currency,
                receipt: receipt || `receipt_${Date.now()}`,
                notes: notes || {}
            };

            // Create order with Razorpay
            const razorpayOrder = await razorpay.orders.create(options);

            res.status(200).json({
                type: "success",
                message: "Razorpay order created successfully",
                order: razorpayOrder
            });

        } catch (error) {
            console.error('Razorpay order creation error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to create Razorpay order",
                error: error.message
            });
        }
    },

    /* Verify Razorpay payment signature */
    async verify_razorpay_payment(req, res) {
        try {
            const { 
                razorpay_order_id, 
                razorpay_payment_id, 
                razorpay_signature,
                order_id // MongoDB order ID
            } = req.body;

            // Validate required fields
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
                return res.status(400).json({
                    type: "error",
                    message: "Missing required payment verification parameters"
                });
            }

            // Create signature for verification
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');

            // Verify signature
            if (expectedSignature === razorpay_signature) {
                // Payment is verified, update order status
                const updatedOrder = await Order.findByIdAndUpdate(
                    order_id,
                    { 
                        status: 'paid',
                        razorpay_order_id: razorpay_order_id,
                        razorpay_payment_id: razorpay_payment_id,
                        razorpay_signature: razorpay_signature,
                        payment_date: new Date()
                    },
                    { new: true }
                );

                if (!updatedOrder) {
                    return res.status(404).json({
                        type: "error",
                        message: "Order not found"
                    });
                }

                res.status(200).json({
                    type: "success",
                    message: "Payment verified and order updated successfully",
                    order: updatedOrder
                });

            } else {
                // Invalid signature
                res.status(400).json({
                    type: "error",
                    message: "Payment verification failed - Invalid signature"
                });
            }

        } catch (error) {
            console.error('Payment verification error:', error);
            res.status(500).json({
                type: "error",
                message: "Payment verification failed",
                error: error.message
            });
        }
    },

    /* Get payment details from Razorpay */
    async get_payment_details(req, res) {
        try {
            const { payment_id } = req.params;

            if (!payment_id) {
                return res.status(400).json({
                    type: "error",
                    message: "Payment ID is required"
                });
            }

            const payment = await razorpay.payments.fetch(payment_id);

            res.status(200).json({
                type: "success",
                payment: payment
            });

        } catch (error) {
            console.error('Get payment details error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to fetch payment details",
                error: error.message
            });
        }
    }
};

module.exports = PaymentController;