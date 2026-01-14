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
    body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
    body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('image').isURL().withMessage('Image must be a valid URL'),
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

module.exports = {
    validateProduct,
    validateGuestOrder,
    validateOrderTracking,
    validateObjectId,
    validatePagination,
    handleValidationErrors
};
