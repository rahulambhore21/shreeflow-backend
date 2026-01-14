const express = require('express');
const router = express.Router();

const { ProductController } = require('../controllers');
const { validateObjectId, validatePagination, validateProduct } = require('../middlewares/validation');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', validatePagination, ProductController.get_products);
router.get('/:id', validateObjectId, ProductController.get_product);

// Admin routes (protected)
router.post('/', verifyToken, verifyAdmin, validateProduct, ProductController.create_product);
router.put('/:id', verifyToken, verifyAdmin, validateObjectId, ProductController.update_product);
router.delete('/:id', verifyToken, verifyAdmin, validateObjectId, ProductController.delete_product);

module.exports = router;