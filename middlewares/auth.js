const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        let token = req.header('Authorization') || req.header('token');
        
        if (!token) {
            return res.status(401).json({
                type: "error",
                message: "Access denied. No token provided."
            });
        }

        // Remove Bearer prefix if present
        if (token.startsWith('Bearer ')) {
            token = token.slice(7);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            type: "error",
            message: "Invalid token"
        });
    }
};

// Verify admin privileges
const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                type: "error",
                message: "Access denied. Admin privileges required."
            });
        }
        
        next();
    } catch (error) {
        res.status(500).json({
            type: "error",
            message: "Error verifying admin status"
        });
    }
};

module.exports = { verifyToken, verifyAdmin };
