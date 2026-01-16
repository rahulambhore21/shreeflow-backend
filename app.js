const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
require('dotenv').config();

const logger = require('./config/logger');
const { validateEnvVariables } = require('./utils/envValidator');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { product_route, order_route, payment_route, auth_route, article_route, shiprocket_route, analytics_route, shipping_route } = require('./routes');

// Validate environment variables
validateEnvVariables();

const app = express();

// Initialize Sentry (only in production if DSN is configured)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Sentry.Integrations.Express({ app }),
            new ProfilingIntegration(),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV || 'development',
    });
    
    // Sentry request handler must be the first middleware
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
    
    logger.info('✅ Sentry error monitoring initialized');
}

// Security middleware - Apply Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Performance middleware - Enable compression
app.use(compression());

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Security middleware - Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        type: 'error',
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        type: 'error',
        message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/v1/auth', authLimiter);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000'|| 'https://shreeflow-frontend.admkartech.cloud',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add input sanitization middleware globally
const { sanitizeInput } = require('./middlewares/validation');
app.use(sanitizeInput);

// CSRF Protection (optional - enable in production)
// Note: CSRF protection is commented out by default to avoid breaking existing API clients
// Uncomment the following lines to enable CSRF protection:
// const { doubleCsrfProtection, generateToken } = require('./middlewares/csrf');
// app.use(doubleCsrfProtection);
// app.get('/api/v1/csrf-token', (req, res) => {
//     const token = generateToken(req, res);
//     res.json({ csrfToken: token });
// });

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

// Sentry error handler must be before other error handlers
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        logger.info('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📡 API URL: http://localhost:${PORT}/api/v1`);
        });
    })
    .catch((err) => {
        logger.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = app;
