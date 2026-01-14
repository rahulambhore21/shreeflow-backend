const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customer: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        }
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                default: 1,
                min: [1, 'Quantity must be at least 1']
            }
        }
    ],
    amount: {
        type: Number,
        required: true
    },
    address: {
        street: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        zipCode: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'India'
        }
    },
    status: {
        type: String,
        default: "pending",
        enum: ["pending", "paid", "shipped", "delivered", "cancelled"]
    },
    // Razorpay payment fields
    razorpay_order_id: {
        type: String,
        default: null
    },
    razorpay_payment_id: {
        type: String,
        default: null
    },
    razorpay_signature: {
        type: String,
        default: null
    },
    payment_date: {
        type: Date,
        default: null
    },
    // Shipping fields
    shipment_id: {
        type: String,
        default: null
    },
    awb: {
        type: String,
        default: null
    },
    courier_name: {
        type: String,
        default: null
    },
    tracking_url: {
        type: String,
        default: null
    },
    estimated_delivery: {
        type: Date,
        default: null
    },
    shipping_charges: {
        type: Number,
        default: 0
    }
},
    { timestamps: true }
);

// Create indexes for better performance
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ razorpay_order_id: 1 }, { sparse: true });
OrderSchema.index({ razorpay_payment_id: 1 }, { sparse: true });

module.exports = mongoose.model('Order', OrderSchema);