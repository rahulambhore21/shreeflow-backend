const { doubleCsrf } = require('csrf-csrf');

// Configure CSRF protection using modern csrf-csrf package
const { 
    doubleCsrfProtection, 
    generateToken 
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getTokenFromRequest: (req) => {
        return req.headers['x-csrf-token'] || req.body._csrf;
    },
});

module.exports = { doubleCsrfProtection, generateToken };
