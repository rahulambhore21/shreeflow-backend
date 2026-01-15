const mongoose = require('mongoose');

const shippingRateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    baseRate: {
        type: Number,
        required: true,
        min: 0
    },
    perKmRate: {
        type: Number,
        required: true,
        min: 0
    },
    freeShippingThreshold: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDays: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const shippingZoneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    states: [{
        type: String,
        required: true
    }],
    rate: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDays: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const shiprocketIntegrationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    token: {
        type: String,
        required: false // ✅ REMOVED: No password storage
    },
    tokenExpiry: {
        type: Date,
        required: false
    },
    lastAuthenticated: {
        type: Date,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create indexes
shippingRateSchema.index({ active: 1 });
shippingZoneSchema.index({ active: 1 });
shippingZoneSchema.index({ states: 1 });

const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);
const ShippingZone = mongoose.model('ShippingZone', shippingZoneSchema);
const ShiprocketIntegration = mongoose.model('ShiprocketIntegration', shiprocketIntegrationSchema);

module.exports = {
    ShippingRate,
    ShippingZone,
    ShiprocketIntegration
};