const validateEnvVariables = () => {
    const requiredEnvVars = [
        'JWT_SECRET',
        'MONGODB_URI',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET'
    ];

    const optionalEnvVars = [
        'SHIPROCKET_EMAIL',
        'SHIPROCKET_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('Missing required environment variables:');
        missingVars.forEach(varName => {
            console.error(`- ${varName}`);
        });
        console.error('Please check your .env file');
        process.exit(1);
    }

    if (missingOptional.length > 0) {
        console.warn('⚠️  Missing optional environment variables:');
        missingOptional.forEach(varName => {
            console.warn(`- ${varName} (Shiprocket features will be disabled)`);
        });
    }

    console.log('✅ All required environment variables are set');
};

module.exports = { validateEnvVariables };
