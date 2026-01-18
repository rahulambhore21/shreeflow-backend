const Order = require('../models/Order');
const shiprocketService = require('../services/shiprocketService');

const OrderController = {

    /* create new guest order */
    async create_order(req, res) {
        try {
            const orderData = { ...req.body };
            
            // If payment method is COD, set status to 'paid' immediately
            if (orderData.paymentMethod === 'cod') {
                orderData.status = 'paid';
                orderData.payment_date = new Date();
            }
            
            const newOrder = new Order(orderData);
            const savedOrder = await newOrder.save();
            
            // Populate product details for response
            const populatedOrder = await Order.findById(savedOrder._id)
                .populate('products.productId', 'title price image');
            
            res.status(201).json({
                type: "success",
                message: orderData.paymentMethod === 'cod' 
                    ? "Order placed successfully! Pay on delivery." 
                    : "Order created successfully",
                data: populatedOrder
            });
        } catch (err) {
            console.error('Order creation error:', err);
            res.status(500).json({
                type: "error",
                message: "Failed to create order. Please try again.",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    /* get order by contact info for tracking */
    async get_order_by_contact(req, res) {
        try {
            const { email, phone } = req.query;
            
            const orders = await Order.find({
                'customer.email': email.toLowerCase(),
                'customer.phone': phone
            })
            .populate('products.productId', 'title price image')
            .sort({ createdAt: -1 })
            .limit(10); // Limit to recent 10 orders
            
            res.status(200).json({
                type: "success",
                data: orders,
                count: orders.length
            });
        } catch (err) {
            console.error('Order tracking error:', err);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve orders. Please try again.",
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    /* Get all orders (Admin only) */
    async get_all_orders(req, res) {
        try {
            const { page = 1, limit = 10, status, search } = req.query;
            const skip = (page - 1) * limit;
            
            let query = {};
            
            if (status) {
                query.status = status;
            }
            
            if (search) {
                query.$or = [
                    { 'customer.name': { $regex: search, $options: 'i' } },
                    { 'customer.email': { $regex: search, $options: 'i' } },
                    { 'customer.phone': { $regex: search, $options: 'i' } }
                ];
            }
            
            const orders = await Order.find(query)
                .populate('products.productId', 'title price image')
                .sort({ createdAt: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit));
                
            const totalOrders = await Order.countDocuments(query);
            
            res.status(200).json({
                type: "success",
                data: orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalOrders / limit),
                    totalItems: totalOrders,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (err) {
            console.error('Get all orders error:', err);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve orders",
                error: err.message
            });
        }
    },

    /* Update order status (Admin only) */
    async update_order_status(req, res) {
        try {
            const { id } = req.params;
            const { status, courier_name, awb, tracking_url, estimated_delivery } = req.body;
            
            if (!['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({
                    type: "error",
                    message: "Invalid order status"
                });
            }
            
            const updateData = { status };
            
            if (courier_name) updateData.courier_name = courier_name;
            if (awb) updateData.awb = awb;
            if (tracking_url) updateData.tracking_url = tracking_url;
            if (estimated_delivery) updateData.estimated_delivery = new Date(estimated_delivery);
            
            const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true })
                .populate('products.productId', 'title price image');
                
            if (!updatedOrder) {
                return res.status(404).json({
                    type: "error",
                    message: "Order not found"
                });
            }
            
            res.status(200).json({
                type: "success",
                message: "Order updated successfully",
                data: updatedOrder
            });
        } catch (err) {
            console.error('Update order error:', err);
            res.status(500).json({
                type: "error",
                message: "Failed to update order",
                error: err.message
            });
        }
    },

    /* Get order analytics (Admin only) */
    async get_order_analytics(req, res) {
        try {
            const totalOrders = await Order.countDocuments();
            const pendingOrders = await Order.countDocuments({ status: 'pending' });
            const paidOrders = await Order.countDocuments({ status: 'paid' });
            const shippedOrders = await Order.countDocuments({ status: 'shipped' });
            const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
            const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
            
            // Calculate total revenue from paid and delivered orders
            const revenueResult = await Order.aggregate([
                { $match: { status: { $in: ['paid', 'delivered'] } } },
                { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
            ]);
            
            const totalRevenue = revenueResult[0]?.totalRevenue || 0;
            
            // Monthly revenue trend (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const monthlyRevenue = await Order.aggregate([
                {
                    $match: {
                        status: { $in: ['paid', 'delivered'] },
                        createdAt: { $gte: sixMonthsAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        revenue: { $sum: '$amount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
            
            // Recent orders
            const recentOrders = await Order.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('products.productId', 'title price')
                .select('customer amount status createdAt');
            
            // Top customers by order value
            const topCustomers = await Order.aggregate([
                { $match: { status: { $in: ['paid', 'delivered'] } } },
                {
                    $group: {
                        _id: '$customer.email',
                        customerName: { $first: '$customer.name' },
                        totalSpent: { $sum: '$amount' },
                        orderCount: { $sum: 1 }
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 }
            ]);
            
            res.status(200).json({
                type: "success",
                data: {
                    totalOrders,
                    ordersByStatus: {
                        pending: pendingOrders,
                        paid: paidOrders,
                        shipped: shippedOrders,
                        delivered: deliveredOrders,
                        cancelled: cancelledOrders
                    },
                    totalRevenue,
                    monthlyRevenue,
                    recentOrders,
                    topCustomers
                }
            });
        } catch (err) {
            console.error('Get order analytics error:', err);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve analytics",
                error: err.message
            });
        }
    },

    /* Create Shiprocket shipment for order */
    async createShipment(req, res) {
        try {
            const { orderId } = req.params;
            
            // Populate products to get product details
            const order = await Order.findById(orderId).populate('products.productId');
            if (!order) {
                return res.status(404).json({
                    type: "error",
                    message: "Order not found"
                });
            }

            console.log('📦 Creating shipment for order:', {
                id: order._id,
                hasCustomer: !!order.customer,
                customerData: order.customer,
                hasProducts: !!order.products && order.products.length > 0,
                productsCount: order.products?.length,
                hasAddress: !!order.address,
                addressData: order.address,
                paymentMethod: order.paymentMethod,
                amount: order.amount,
                shipping_charges: order.shipping_charges
            });

            // Validate required order data
            if (!order.customer || !order.customer.name || !order.customer.phone || !order.customer.email) {
                return res.status(400).json({
                    type: "error",
                    message: "Order missing customer information"
                });
            }

            if (!order.address || !order.address.street || !order.address.city || !order.address.state || !order.address.zipCode) {
                return res.status(400).json({
                    type: "error",
                    message: "Order missing complete address information"
                });
            }

            if (order.shipment_id) {
                return res.status(400).json({
                    type: "error",
                    message: "Shipment already created for this order",
                    shipmentId: order.shipment_id
                });
            }

            // Check Shiprocket integration status
            const integrationStatus = await shiprocketService.checkIntegrationStatus();
            console.log('🔍 Shiprocket integration status:', integrationStatus);

            if (integrationStatus.status === 'token_expired') {
                return res.status(400).json({
                    type: "error",
                    message: "Shiprocket authentication expired. Please re-login in Shipping settings.",
                    requiresReauth: true
                });
            }

            if (integrationStatus.status === 'error') {
                return res.status(400).json({
                    type: "error",
                    message: `Shiprocket integration error: ${integrationStatus.message}`,
                    requiresReauth: integrationStatus.requires_reauth
                });
            }

            // Create shipment in Shiprocket
            console.log('🚀 Creating shipment in Shiprocket...');
            const shipmentResult = await shiprocketService.createOrderFromOurFormat(order);
            console.log('✅ Shipment created successfully:', shipmentResult);
            
            // Update order with shipment details
            order.shipment_id = shipmentResult.shipment_id;
            order.status = 'shipped';
            if (shipmentResult.awb_code) {
                order.awb = shipmentResult.awb_code;
            }
            await order.save();

            res.status(200).json({
                type: "success",
                message: "Shipment created successfully",
                data: {
                    orderId: order._id,
                    shipmentId: shipmentResult.shipment_id,
                    awb: shipmentResult.awb_code,
                    courierName: shipmentResult.courier_name
                }
            });
        } catch (error) {
            console.error('❌ Create shipment error:', error);
            
            // Provide more specific error messages
            let errorMessage = "Failed to create shipment";
            if (error.message.includes('TOKEN_EXPIRED')) {
                errorMessage = "Shiprocket authentication expired. Please re-login in Shipping settings.";
            } else if (error.message.includes('not configured')) {
                errorMessage = "Shiprocket integration not configured. Please configure it in Shipping settings.";
            } else if (error.response?.data?.message) {
                errorMessage = `Shiprocket error: ${error.response.data.message}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            res.status(500).json({
                type: "error",
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /* Track order shipment */
    async trackShipment(req, res) {
        try {
            const { orderId } = req.params;
            
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    type: "error",
                    message: "Order not found"
                });
            }

            if (!order.shipment_id) {
                return res.status(400).json({
                    type: "error",
                    message: "No shipment found for this order"
                });
            }

            // Get tracking details from Shiprocket
            const trackingData = await shiprocketService.trackShipment(order.shipment_id);
            
            res.status(200).json({
                type: "success",
                data: {
                    orderId: order._id,
                    shipmentId: order.shipment_id,
                    awb: order.awb,
                    trackingData: trackingData
                }
            });
        } catch (error) {
            console.error('Track shipment error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to track shipment",
                error: error.message
            });
        }
    },

    /* Check Shiprocket integration status */
    async checkShiprocketStatus(req, res) {
        try {
            const status = await shiprocketService.checkIntegrationStatus();
            
            res.status(200).json({
                type: "success",
                data: status
            });
        } catch (error) {
            console.error('Check Shiprocket status error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to check Shiprocket status",
                error: error.message
            });
        }
    }

};

module.exports = OrderController;