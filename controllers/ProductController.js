const Product = require('../models/Product');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

const ProductController = {
    
    /* get all products */
    async get_products(req, res) {

        const qNew = req.query.new;
        const qCategory = req.query.category;
        const { page, limit, skip } = getPaginationParams(req);

        try {

            let products;
            let total;

            if(qNew) {
                products = await Product.find().sort({ createdAt: -1 }).limit(5);
                total = products.length;
            } else if (qCategory) {
                const categoryFilter = { 
                    categories: {
                        $in: [qCategory]
                    }
                };
                products = await Product.find(categoryFilter).skip(skip).limit(limit);
                total = await Product.countDocuments(categoryFilter);
            } else {
                products = await Product.find().skip(skip).limit(limit);
                total = await Product.countDocuments();
            }

            if (qNew) {
                res.status(200).json({
                    type: "success",
                    products
                });
            } else {
                const paginatedResponse = createPaginationResponse(products, total, page, limit);
                res.status(200).json({
                    type: "success",
                    ...paginatedResponse
                });
            }
        } catch (err) {
            res.status(500).json({
                type: "error",
                message: "Something went wrong please try again",
                err
            })
        }
    },

    /* get single product */
    async get_product(req, res) {
        try {
            // Check if the param is a slug (contains non-hex characters or hyphens)
            const isSlug = /[^a-f0-9]/i.test(req.params.id) || req.params.id.includes('-');
            
            let product;
            if (isSlug) {
                // Search by converting slug back to title format
                const titleFromSlug = req.params.id.replace(/-/g, ' ');
                product = await Product.findOne({
                    title: new RegExp(`^${titleFromSlug}$`, 'i')
                });
            } else {
                // Search by MongoDB ID
                product = await Product.findById(req.params.id);
            }
            
            if(!product) {
                res.status(404).json({
                    type: "error",
                    message: "Product doesn't exists"
                })
            } else{
                res.status(200).json({
                    type: "success",
                    data: product
                })
            }   
        } catch (err) {
            res.status(500).json({
                type: "error",
                message: "Something went wrong please try again",
                err
            })
        }
    },

    /* create new product */
    async create_product(req, res) {
        try {
            console.log('Creating product with data:', req.body);
            console.log('User info:', req.user);
            
            // Clean up empty string values for optional fields
            const productData = { ...req.body };
            
            // Convert empty strings to undefined for sparse unique fields
            if (productData.sku === '') {
                delete productData.sku;
            }
            if (productData.size === '') {
                delete productData.size;
            }
            if (productData.color === '') {
                delete productData.color;
            }
            
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();
            
            res.status(201).json({
                type: "success",
                message: "Product created successfully",
                data: savedProduct
            })
        } catch (err) {
            console.error('Error creating product:', err);
            
            // Handle Mongoose validation errors
            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    type: "error",
                    message: "Validation failed",
                    errors: Object.values(err.errors).map(e => e.message)
                });
            }
            
            // Handle duplicate key errors
            if (err.code === 11000) {
                const field = Object.keys(err.keyPattern)[0];
                return res.status(400).json({
                    type: "error",
                    message: `${field} already exists`,
                    field
                });
            }
            
            res.status(500).json({
                type: "error",
                message: "Something went wrong please try again",
                error: err.message
            })
        }
    },

    /* update product */
    async update_product(req, res) {
        const existing = await Product.findById(req.params.id);
        if(!existing){
            res.status(404).json({
                type: "error",
                message: "Product doesn't exists"
            })
        } else {
            try {
                const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {
                    $set: req.body
                },
                    { new: true }
                );
                res.status(200).json({
                    type: "success",
                    message: "Product updated successfully",
                    updatedProduct
                })
            } catch (err) {
                res.status(500).json({
                    type: "error",
                    message: "Something went wrong please try again",
                    err
                })
            }
        }
    },

    /* delete product */
    async delete_product(req, res) {
        const existing = await Product.findById(req.params.id);
        if (!existing) {
            res.status(404).json({
                type: "error",
                message: "Product doesn't exists"
            })
        } else {
            try {
                await Product.findByIdAndDelete(req.params.id);
                res.status(200).json({
                    type: "success",
                    message: "Product has been deleted successfully"
                });
            } catch (err) {
                res.status(500).json({
                    type: "error",
                    message: "Something went wrong please try again",
                    err
                })
            }
        }
    }
};

module.exports = ProductController;