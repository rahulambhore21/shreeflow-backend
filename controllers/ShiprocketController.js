const shiprocketService = require('../services/shiprocketService');
const Order = require('../models/Order');

const ShiprocketController = {

    /* Get shipping rates */
    async getShippingRates(req, res) {
        try {
            const { pickup_postcode, delivery_postcode, weight, length, breadth, height } = req.body;

            // Validate required fields
            if (!pickup_postcode || !delivery_postcode || !weight) {
                return res.status(400).json({
                    type: "error",
                    message: "pickup_postcode, delivery_postcode, and weight are required"
                });
            }

            const rates = await shiprocketService.getShippingRates({
                pickup_postcode,
                delivery_postcode,
                weight: parseFloat(weight),
                length: parseFloat(length) || 10,
                breadth: parseFloat(breadth) || 10,
                height: parseFloat(height) || 10
            });

            res.status(200).json({
                type: "success",
                data: rates
            });

        } catch (error) {
            console.error('Get shipping rates error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to get shipping rates",
                error: error.message
            });
        }
    },

    /* Create shipping order */
    async createShippingOrder(req, res) {
        try {
            const { order_id, courier_id } = req.body;

            if (!order_id) {
                return res.status(400).json({
                    type: "error",
                    message: "order_id is required"
                });
            }

            // Get order from database
            const order = await Order.findById(order_id).populate('products.productId');
            if (!order) {
                return res.status(404).json({
                    type: "error",
                    message: "Order not found"
                });
            }

            // Prepare order items for Shiprocket
            const order_items = order.products.map(item => ({
                name: item.productId.title,
                sku: item.productId.sku || `SKU-${item.productId._id}`,
                units: item.quantity,
                selling_price: item.productId.price,
                discount: 0,
                tax: 0,
                hsn: 441122 // Default HSN code, you may want to add this to product model
            }));

            // Calculate dimensions and weight (you may want to add these to product model)
            const totalWeight = order.products.length * 0.5; // Default weight per item
            const dimensions = {
                length: 20,
                breadth: 15,
                height: 10,
                weight: totalWeight
            };

            // Create shipping order data
            const shippingOrderData = {
                order_id: order._id.toString(),
                order_date: order.createdAt.toISOString().split('T')[0],
                pickup_location: "Primary", // You should have this configured in Shiprocket
                channel_id: "",
                comment: "Water Level Controller Order",
                reseller_name: "",
                company_name: "Shree Flow",
                billing_customer_name: order.customer.name.split(' ')[0],
                billing_last_name: order.customer.name.split(' ').slice(1).join(' ') || "",
                billing_address: order.address.street,
                billing_address_2: "",
                billing_city: order.address.city,
                billing_pincode: order.address.zipCode,
                billing_state: order.address.state,
                billing_country: order.address.country,
                billing_email: order.customer.email,
                billing_phone: order.customer.phone,
                shipping_is_billing: true,
                shipping_customer_name: order.customer.name.split(' ')[0],
                shipping_last_name: order.customer.name.split(' ').slice(1).join(' ') || "",
                shipping_address: order.address.street,
                shipping_address_2: "",
                shipping_city: order.address.city,
                shipping_pincode: order.address.zipCode,
                shipping_state: order.address.state,
                shipping_country: order.address.country,
                shipping_email: order.customer.email,
                shipping_phone: order.customer.phone,
                order_items,
                payment_method: order.razorpay_payment_id ? "Prepaid" : "COD",
                shipping_charges: 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: 0,
                sub_total: order.amount,
                ...dimensions
            };

            const shippingOrder = await shiprocketService.createOrder(shippingOrderData);

            // If courier_id is provided, generate AWB
            if (courier_id && shippingOrder.shipment_id) {
                const awb = await shiprocketService.generateAWB(shippingOrder.shipment_id, courier_id);
                shippingOrder.awb_details = awb;
            }

            // Update order status
            await Order.findByIdAndUpdate(order_id, { 
                status: 'shipped',
                shipment_id: shippingOrder.shipment_id,
                awb: shippingOrder.awb_details?.awb_code
            });

            res.status(200).json({
                type: "success",
                message: "Shipping order created successfully",
                data: shippingOrder
            });

        } catch (error) {
            console.error('Create shipping order error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to create shipping order",
                error: error.message
            });
        }
    },

    /* Track shipment */
    async trackShipment(req, res) {
        try {
            const { awb } = req.params;

            if (!awb) {
                return res.status(400).json({
                    type: "error",
                    message: "AWB number is required"
                });
            }

            const tracking = await shiprocketService.trackShipment(awb);

            res.status(200).json({
                type: "success",
                data: tracking
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

    /* Get pickup locations */
    async getPickupLocations(req, res) {
        try {
            const locations = await shiprocketService.getPickupLocations();

            res.status(200).json({
                type: "success",
                data: locations
            });

        } catch (error) {
            console.error('Get pickup locations error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to get pickup locations",
                error: error.message
            });
        }
    },

    /* Get available couriers */
    async getAvailableCouriers(req, res) {
        try {
            const { pickup_postcode, delivery_postcode, weight, length, breadth, height } = req.query;

            if (!pickup_postcode || !delivery_postcode || !weight) {
                return res.status(400).json({
                    type: "error",
                    message: "pickup_postcode, delivery_postcode, and weight are required"
                });
            }

            const couriers = await shiprocketService.getAvailableCouriers({
                pickup_postcode,
                delivery_postcode,
                weight: parseFloat(weight),
                length: parseFloat(length) || 10,
                breadth: parseFloat(breadth) || 10,
                height: parseFloat(height) || 10
            });

            res.status(200).json({
                type: "success",
                data: couriers
            });

        } catch (error) {
            console.error('Get available couriers error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to get available couriers",
                error: error.message
            });
        }
    },

    /* Cancel shipment */
    async cancelShipment(req, res) {
        try {
            const { awb } = req.body;

            if (!awb) {
                return res.status(400).json({
                    type: "error",
                    message: "AWB number is required"
                });
            }

            const result = await shiprocketService.cancelShipment(awb);

            res.status(200).json({
                type: "success",
                message: "Shipment cancelled successfully",
                data: result
            });

        } catch (error) {
            console.error('Cancel shipment error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to cancel shipment",
                error: error.message
            });
        }
    }
};

module.exports = ShiprocketController;