const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        let token = req.header('Authorization') || req.header('token');
        
        console.log('Received token:', token ? 'Token present' : 'No token');
        
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
        console.log('Token decoded successfully:', { id: decoded.id, username: decoded.username });
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(401).json({
            type: "error",
            message: "Invalid token",
            error: error.message
        });
    }
};

// Verify admin privileges
const verifyAdmin = async (req, res, next) => {
    try {
        console.log('Verifying admin for user:', req.user);
        const user = await User.findById(req.user.id);
        console.log('Found user:', user ? { id: user._id, username: user.username, isAdmin: user.isAdmin } : 'User not found');
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                type: "error",
                message: "Access denied. Admin privileges required."
            });
        }
        
        next();
    } catch (error) {
        console.error('Error verifying admin status:', error);
        res.status(500).json({
            type: "error",
            message: "Error verifying admin status",
            error: error.message
        });
    }
};

module.exports = { verifyToken, verifyAdmin };
