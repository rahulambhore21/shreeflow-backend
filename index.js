const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables

const app = express();

// Validate environment variables
const { validateEnvVariables } = require('./utils/envValidator');
validateEnvVariables();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token']
}));

/* configure body-parser */
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const { product_route, order_route, payment_route } = require('./routes');

app.use('/api/v1/products', product_route);
app.use('/api/v1/orders', order_route);
app.use('/api/v1/payments', payment_route);

// Error handling middleware
const { errorHandler, notFound } = require('./middlewares/errorHandler');
app.use(notFound);
app.use(errorHandler);

const dbConfig = require('./config/database-config');

/* connecting to the database */
mongoose.connect(dbConfig.URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

/* listen for requests */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
});