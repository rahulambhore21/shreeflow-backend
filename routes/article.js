const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { ArticleController } = require('../controllers');
const { handleValidationErrors } = require('../middlewares/validation');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// Article validation rules
const validateArticle = [
    body('title').isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    body('content').isLength({ min: 50 }).withMessage('Content must be at least 50 characters'),
    body('featuredImage').isURL().withMessage('Featured image must be a valid URL'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    handleValidationErrors
];

const validateArticleUpdate = [
    body('title').optional().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    body('content').optional().isLength({ min: 50 }).withMessage('Content must be at least 50 characters'),
    body('featuredImage').optional().isURL().withMessage('Featured image must be a valid URL'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    handleValidationErrors
];

// Admin routes (protected) - must come before dynamic routes
// Get article analytics
router.get('/admin/analytics', verifyToken, verifyAdmin, ArticleController.get_analytics);

// Public routes
// Get all articles (with filters)
router.get('/', ArticleController.get_articles);

// Get single article by slug or ID
router.get('/:identifier', ArticleController.get_article);

// Admin routes (protected)
// Create new article
router.post('/', verifyToken, verifyAdmin, validateArticle, ArticleController.create_article);

// Update article
router.put('/:id', verifyToken, verifyAdmin, validateArticleUpdate, ArticleController.update_article);

// Delete article
router.delete('/:id', verifyToken, verifyAdmin, ArticleController.delete_article);

module.exports = router;