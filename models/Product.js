const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Product title is required'],
        unique: true,
        maxlength: [200, 'Title must not exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        minlength: [10, 'Description must be at least 10 characters']
    },
    image: {
        type: String,
        required: [true, 'Product image is required']
    },
    categories: {
        type: [String],
        default: []
    },
    size: {
        type: String
    },
    color: {
        type: String
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price must be a positive number']
    },
    sku: {
        type: String,
        unique: true,
        sparse: true
    },
    active: {
        type: Boolean,
        default: true
    },
    // Shipping dimensions for Shiprocket
    weight: {
        type: Number,
        default: 0.5,
        min: [0.01, 'Weight must be at least 0.01 kg'],
        max: [50, 'Weight cannot exceed 50 kg']
    },
    length: {
        type: Number,
        default: 10,
        min: [1, 'Length must be at least 1 cm'],
        max: [200, 'Length cannot exceed 200 cm']
    },
    breadth: {
        type: Number,
        default: 10,
        min: [1, 'Breadth must be at least 1 cm'],
        max: [200, 'Breadth cannot exceed 200 cm']
    },
    height: {
        type: Number,
        default: 5,
        min: [1, 'Height must be at least 1 cm'],
        max: [200, 'Height cannot exceed 200 cm']
    }
},
    { timestamps: true }
);

// Create indexes for better performance
ProductSchema.index({ title: 1 });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ sku: 1 }, { sparse: true });

module.exports = mongoose.model('Product', ProductSchema);