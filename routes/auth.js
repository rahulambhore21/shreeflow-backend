const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { AuthController } = require('../controllers');
const { handleValidationErrors } = require('../middlewares/validation');
const { verifyToken } = require('../middlewares/auth');

// Validation rules
const registerValidation = [
    body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors
];

const loginValidation = [
    body('username').notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

// Routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.get('/profile', verifyToken, AuthController.getProfile);

module.exports = router;