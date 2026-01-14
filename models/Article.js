const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Article title is required'],
        unique: true,
        maxlength: [200, 'Title must not exceed 200 characters'],
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    content: {
        type: String,
        required: [true, 'Article content is required'],
        minlength: [50, 'Content must be at least 50 characters']
    },
    excerpt: {
        type: String,
        maxlength: [300, 'Excerpt must not exceed 300 characters'],
        trim: true
    },
    featuredImage: {
        type: String,
        required: [true, 'Featured image is required']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    categories: [{
        type: String,
        trim: true
    }],
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    publishedAt: {
        type: Date,
        default: null
    },
    seoTitle: {
        type: String,
        maxlength: [60, 'SEO title must not exceed 60 characters']
    },
    seoDescription: {
        type: String,
        maxlength: [160, 'SEO description must not exceed 160 characters']
    },
    readingTime: {
        type: Number, // in minutes
        default: 1
    }
}, { 
    timestamps: true 
});

// Middleware to generate slug from title
ArticleSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    
    // Auto-generate excerpt from content if not provided
    if (!this.excerpt && this.content) {
        this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
    }
    
    // Calculate reading time (average 200 words per minute)
    if (this.content) {
        const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    
    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    next();
});

// Create indexes for better performance
ArticleSchema.index({ slug: 1 });
ArticleSchema.index({ status: 1 });
ArticleSchema.index({ author: 1 });
ArticleSchema.index({ createdAt: -1 });
ArticleSchema.index({ publishedAt: -1 });
ArticleSchema.index({ tags: 1 });
ArticleSchema.index({ categories: 1 });
ArticleSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Article', ArticleSchema);