const product_route = require('./product');
const order_route = require('./order');
const payment_route = require('./payment');
const auth_route = require('./auth');
const article_route = require('./article');
const shiprocket_route = require('./shiprocket');
const analytics_route = require('./analytics');
const shipping_route = require('./shipping');

module.exports = {
    product_route,
    order_route,
    payment_route,
    auth_route,
    article_route,
    shiprocket_route,
    analytics_route,
    shipping_route
};