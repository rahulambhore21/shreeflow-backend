module.exports = {
    api: {
        jwt_secret: process.env.JWT_SECRET
    }
};

// Validate JWT_SECRET is provided
if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Please add a strong JWT_SECRET (minimum 32 characters) to your .env file');
    process.exit(1);
}