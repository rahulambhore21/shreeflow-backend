// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            type: "error",
            message: "Validation Error",
            errors
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            type: "error",
            message: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            type: "error",
            message: "Invalid token"
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            type: "error",
            message: "Token expired"
        });
    }

    // MongoDB CastError
    if (err.name === 'CastError') {
        return res.status(400).json({
            type: "error",
            message: "Invalid ID format"
        });
    }

    // Default server error
    res.status(err.statusCode || 500).json({
        type: "error",
        message: err.message || "Internal server error"
    });
};

// 404 handler
const notFound = (req, res, next) => {
    res.status(404).json({
        type: "error",
        message: `Route ${req.originalUrl} not found`
    });
};

module.exports = { errorHandler, notFound };
