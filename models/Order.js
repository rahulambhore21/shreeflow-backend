const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        sparse: true
    },
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
    // Payment method
    paymentMethod: {
        type: String,
        enum: ["online", "cod"],
        default: "online"
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
    // ✅ ENHANCED: Complete shipment tracking
    shipment: {
        shiprocket_order_id: {
            type: String,
            default: null
        },
        shipment_id: {
            type: String,
            default: null
        },
        awb_code: {
            type: String,
            default: null
        },
        courier_name: {
            type: String,
            default: null
        },
        courier_company_id: {
            type: String,
            default: null
        },
        status: {
            type: String,
            default: 'Pending'
        },
        estimated_delivery: {
            type: Date,
            default: null
        },
        shipping_cost: {
            type: Number,
            default: 0
        },
        last_location: {
            type: String,
            default: null
        },
        last_update: {
            type: Date,
            default: null
        },
        created_at: {
            type: Date,
            default: null
        }
    },
    // Legacy shipping fields (for backward compatibility)
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
    },
    // New fields for automatic shipment creation
    shiprocket_order_id: {
        type: String,
        default: null
    },
    shiprocket_shipment_id: {
        type: String,
        default: null
    },
    awb_code: {
        type: String,
        default: null
    }
},
    { timestamps: true }
);

// Generate custom order ID before saving
OrderSchema.pre('save', async function(next) {
    if (!this.orderId && this.isNew) {
        try {
            const year = new Date().getFullYear();
            const month = String(new Date().getMonth() + 1).padStart(2, '0');
            
            // Find the last order for this year-month
            const lastOrder = await this.constructor.findOne({
                orderId: new RegExp(`^SF-${year}${month}-`)
            }).sort({ orderId: -1 });
            
            let sequence = 1;
            if (lastOrder && lastOrder.orderId) {
                const lastSequence = parseInt(lastOrder.orderId.split('-')[2]);
                sequence = lastSequence + 1;
            }
            
            // Generate order ID: SF-YYYYMM-XXXX (e.g., SF-202601-0001)
            this.orderId = `SF-${year}${month}-${String(sequence).padStart(4, '0')}`;
        } catch (error) {
            console.error('Error generating order ID:', error);
            // Fallback to timestamp-based ID
            this.orderId = `SF-${Date.now()}`;
        }
    }
    next();
});

// Create indexes for better performance
OrderSchema.index({ orderId: 1 }, { unique: true, sparse: true });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ 'customer.phone': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ razorpay_order_id: 1 }, { sparse: true });
OrderSchema.index({ razorpay_payment_id: 1 }, { sparse: true });
OrderSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Order', OrderSchema);