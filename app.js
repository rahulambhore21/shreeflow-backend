const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { validateEnvVariables } = require('./utils/envValidator');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { product_route, order_route, payment_route, auth_route, article_route, shiprocket_route, analytics_route, shipping_route } = require('./routes');

// Validate environment variables
validateEnvVariables();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', auth_route);
app.use('/api/v1/products', product_route);
app.use('/api/v1/orders', order_route);
app.use('/api/v1/payments', payment_route);
app.use('/api/v1/articles', article_route);
app.use('/api/v1/shiprocket', shiprocket_route);
app.use('/api/v1/analytics', analytics_route);
app.use('/api/v1/shipping', shipping_route);

// Health check route
app.get('/api/v1/health', (req, res) => {
    res.json({ 
        type: 'success', 
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API URL: http://localhost:${PORT}/api/v1`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = app;
