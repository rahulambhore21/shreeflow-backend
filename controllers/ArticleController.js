const Article = require('../models/Article');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

const ArticleController = {
    
    /* Get all articles with filters and pagination */
    async get_articles(req, res) {
        try {
            const { page, limit, skip } = getPaginationParams(req);
            const { status, category, tag, author, search } = req.query;
            
            let query = {};
            
            // Build query filters
            if (status && ['draft', 'published', 'archived'].includes(status)) {
                query.status = status;
            } else if (!req.user?.isAdmin) {
                // Non-admin users can only see published articles
                query.status = 'published';
            }
            
            if (category) {
                query.categories = { $in: [category] };
            }
            
            if (tag) {
                query.tags = { $in: [tag] };
            }
            
            if (author) {
                query.author = author;
            }
            
            if (search) {
                query.$text = { $search: search };
            }
            
            const articles = await Article.find(query)
                .populate('author', 'username email')
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit);
                
            const total = await Article.countDocuments(query);
            
            const paginatedResponse = createPaginationResponse(articles, total, page, limit);
            
            res.status(200).json({
                type: "success",
                ...paginatedResponse
            });
            
        } catch (error) {
            console.error('Get articles error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve articles",
                error: error.message
            });
        }
    },

    /* Get single article by slug or ID */
    async get_article(req, res) {
        try {
            const { identifier } = req.params;
            
            // Try to find by slug first, then by ID
            let article = await Article.findOne({ slug: identifier })
                .populate('author', 'username email');
                
            if (!article) {
                article = await Article.findById(identifier)
                    .populate('author', 'username email');
            }
            
            if (!article) {
                return res.status(404).json({
                    type: "error",
                    message: "Article not found"
                });
            }
            
            // Check if user can view this article
            if (article.status !== 'published' && (!req.user || !req.user.isAdmin)) {
                return res.status(403).json({
                    type: "error", 
                    message: "Access denied"
                });
            }
            
            // Increment view count for published articles
            if (article.status === 'published') {
                await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } });
                article.views += 1;
            }
            
            res.status(200).json({
                type: "success",
                data: article
            });
            
        } catch (error) {
            console.error('Get article error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve article",
                error: error.message
            });
        }
    },

    /* Create new article (Admin only) */
    async create_article(req, res) {
        try {
            console.log('Create article request body:', req.body);
            console.log('User from token:', req.user);
            
            const articleData = {
                ...req.body,
                author: req.user.id
            };
            
            console.log('Article data to save:', articleData);
            
            const newArticle = new Article(articleData);
            const savedArticle = await newArticle.save();
            
            // Populate author details for response
            const populatedArticle = await Article.findById(savedArticle._id)
                .populate('author', 'username email');
            
            res.status(201).json({
                type: "success",
                message: "Article created successfully",
                data: populatedArticle
            });
            
        } catch (error) {
            console.error('Create article error:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Mongoose validation error
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    type: "error",
                    message: "Validation failed",
                    errors: errors
                });
            }
            
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                return res.status(400).json({
                    type: "error",
                    message: `Article with this ${field} already exists`
                });
            }
            
            res.status(500).json({
                type: "error",
                message: "Failed to create article",
                error: error.message
            });
        }
    },

    /* Update article (Admin only) */
    async update_article(req, res) {
        try {
            const { id } = req.params;
            
            const article = await Article.findById(id);
            if (!article) {
                return res.status(404).json({
                    type: "error",
                    message: "Article not found"
                });
            }
            
            // Update fields
            Object.keys(req.body).forEach(key => {
                if (key !== 'author') { // Don't allow changing author
                    article[key] = req.body[key];
                }
            });
            
            const updatedArticle = await article.save();
            
            // Populate author details for response
            const populatedArticle = await Article.findById(updatedArticle._id)
                .populate('author', 'username email');
            
            res.status(200).json({
                type: "success",
                message: "Article updated successfully",
                data: populatedArticle
            });
            
        } catch (error) {
            console.error('Update article error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to update article",
                error: error.message
            });
        }
    },

    /* Delete article (Admin only) */
    async delete_article(req, res) {
        try {
            const { id } = req.params;
            
            const article = await Article.findById(id);
            if (!article) {
                return res.status(404).json({
                    type: "error",
                    message: "Article not found"
                });
            }
            
            await Article.findByIdAndDelete(id);
            
            res.status(200).json({
                type: "success",
                message: "Article deleted successfully"
            });
            
        } catch (error) {
            console.error('Delete article error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to delete article",
                error: error.message
            });
        }
    },

    /* Get article analytics (Admin only) */
    async get_analytics(req, res) {
        try {
            const totalArticles = await Article.countDocuments();
            const publishedArticles = await Article.countDocuments({ status: 'published' });
            const draftArticles = await Article.countDocuments({ status: 'draft' });
            
            const totalViews = await Article.aggregate([
                { $group: { _id: null, totalViews: { $sum: '$views' } } }
            ]);
            
            const totalLikes = await Article.aggregate([
                { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
            ]);
            
            const topArticles = await Article.find({ status: 'published' })
                .sort({ views: -1 })
                .limit(5)
                .select('title slug views likes publishedAt')
                .populate('author', 'username');
            
            res.status(200).json({
                type: "success",
                data: {
                    totalArticles,
                    publishedArticles,
                    draftArticles,
                    totalViews: totalViews[0]?.totalViews || 0,
                    totalLikes: totalLikes[0]?.totalLikes || 0,
                    topArticles
                }
            });
            
        } catch (error) {
            console.error('Get article analytics error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve analytics",
                error: error.message
            });
        }
    }
};

module.exports = ArticleController;