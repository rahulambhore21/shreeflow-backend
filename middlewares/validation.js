const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            type: "error",
            message: "Validation failed",
            errors: errors.array()
        });
    }
    next();
};

// Product validation rules
const validateProduct = [
    body('title')
        .isLength({ min: 1, max: 200 })
        .withMessage('Title is required and must be less than 200 characters')
        .trim(),
    body('description')
        .isLength({ min: 10 })
        .withMessage('Description must be at least 10 characters')
        .trim(),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    body('image')
        .notEmpty()
        .withMessage('Image is required')
        .isString()
        .withMessage('Image must be a string')
        .custom((value) => {
            // Allow both URLs and data URLs (for base64 images)
            const urlRegex = /^(https?:\/\/|data:image\/)/i;
            if (!urlRegex.test(value)) {
                throw new Error('Image must be a valid URL or data URL');
            }
            return true;
        }),
    body('categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
    body('sku')
        .optional()
        .isString()
        .withMessage('SKU must be a string')
        .trim(),
    body('size')
        .optional()
        .isString()
        .withMessage('Size must be a string')
        .trim(),
    body('color')
        .optional()
        .isString()
        .withMessage('Color must be a string')
        .trim(),
    body('active')
        .optional()
        .isBoolean()
        .withMessage('Active must be a boolean'),
    handleValidationErrors
];

// Guest order validation rules
const validateGuestOrder = [
    body('customer.name').isLength({ min: 2, max: 100 }).withMessage('Customer name is required (2-100 characters)'),
    body('customer.email').isEmail().withMessage('Valid email is required'),
    body('customer.phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
    body('products.*.productId').isMongoId().withMessage('Valid product ID is required'),
    body('products.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('address.street').isLength({ min: 5, max: 200 }).withMessage('Street address is required (5-200 characters)'),
    body('address.city').isLength({ min: 2, max: 50 }).withMessage('City is required (2-50 characters)'),
    body('address.state').isLength({ min: 2, max: 50 }).withMessage('State is required (2-50 characters)'),
    body('address.zipCode').isLength({ min: 3, max: 10 }).withMessage('Zip code is required (3-10 characters)'),
    body('address.country').optional().isLength({ min: 2, max: 50 }).withMessage('Country must be 2-50 characters'),
    handleValidationErrors
];

// Order tracking validation
const validateOrderTracking = [
    query('email').isEmail().withMessage('Valid email is required'),
    query('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    handleValidationErrors
];

// Object ID validation
const validateObjectId = [
    param('id').isMongoId().withMessage('Valid MongoDB ObjectId is required'),
    handleValidationErrors
];

// Pagination validation
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

// Payment validation rules
const validatePaymentOrder = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('currency')
        .optional()
        .isIn(['INR', 'USD', 'EUR'])
        .withMessage('Currency must be INR, USD, or EUR'),
    handleValidationErrors
];

const validatePaymentVerification = [
    body('razorpay_order_id')
        .notEmpty()
        .withMessage('Razorpay order ID is required')
        .isString()
        .withMessage('Razorpay order ID must be a string'),
    body('razorpay_payment_id')
        .notEmpty()
        .withMessage('Razorpay payment ID is required')
        .isString()
        .withMessage('Razorpay payment ID must be a string'),
    body('razorpay_signature')
        .notEmpty()
        .withMessage('Razorpay signature is required')
        .isString()
        .withMessage('Razorpay signature must be a string'),
    handleValidationErrors
];

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Remove any potential MongoDB operators from request body
    if (req.body) {
        const sanitize = (obj) => {
            for (let key in obj) {
                if (typeof key === 'string' && key.startsWith('$')) {
                    delete obj[key];
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitize(obj[key]);
                }
            }
        };
        sanitize(req.body);
    }
    next();
};

module.exports = {
    validateProduct,
    validateGuestOrder,
    validateOrderTracking,
    validateObjectId,
    validatePagination,
    validatePaymentOrder,
    validatePaymentVerification,
    sanitizeInput,
    handleValidationErrors
};
