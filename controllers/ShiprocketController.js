const shiprocketService = require('../services/shiprocketService');
const Order = require('../models/Order');

const ShiprocketController = {
    /* Get shipping rates */
    async getShippingRates(req, res) {
        try {
            const { pickup_postcode, delivery_postcode, weight, length, breadth, height, cod, order_amount } = req.query;

            console.log('📦 Shiprocket Rates Request:', {
                pickup_postcode,
                delivery_postcode,
                weight,
                length,
                breadth,
                height,
                cod,
                order_amount
            });

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
                height: parseFloat(height) || 10,
                cod: parseInt(cod) || 0,
                order_amount: parseFloat(order_amount) || 100
            });

            console.log('✅ Shiprocket Rates Response:', rates);

            res.status(200).json({
                type: "success",
                data: rates.data || rates  // Ensure we return the data object from Shiprocket response
            });

        } catch (error) {
            console.error('❌ Get shipping rates error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to get shipping rates",
                error: error.message
            });
        }
    },

    /* Create shipping order with complete workflow */
    async createShippingOrder(req, res) {
        try {
            const { order_id } = req.body;

            if (!order_id) {
                return res.status(400).json({
                    type: "error",
                    message: "order_id is required"
                });
            }

            // Get order details
            const order = await Order.findById(order_id).populate('products.productId');
            if (!order) {
                return res.status(404).json({
                    type: "error",
                    message: "Order not found"
                });
            }

            if (order.status === 'shipped' && order.shipment) {
                return res.status(400).json({
                    type: "error",
                    message: "Order already shipped"
                });
            }

            // Use the complete shipment workflow from service
            const shipmentResult = await shiprocketService.createOrderFromOurFormat(order);

            // Update order with shipment details
            await Order.findByIdAndUpdate(order_id, {
                status: 'shipped',
                shipment: {
                    shiprocket_order_id: shipmentResult.order_id,
                    shipment_id: shipmentResult.shipment_id,
                    awb_code: shipmentResult.awb_code || null,
                    courier_id: shipmentResult.courier_company_id || null,
                    courier_name: shipmentResult.courier_name || 'Pending Assignment',
                    estimated_delivery_date: shipmentResult.estimated_delivery_date || null,
                    status: 'NEW',
                    tracking_url: shipmentResult.awb_code ? `https://shiprocket.co/tracking/${shipmentResult.awb_code}` : null
                }
            });

            res.status(200).json({
                type: "success",
                message: "Complete shipment created successfully with automatic courier selection",
                data: {
                    shipment_id: shipmentResult.shipment_id,
                    awb_code: shipmentResult.awb_code || 'Pending',
                    courier_name: shipmentResult.courier_name || 'Pending Assignment',
                    estimated_delivery_date: shipmentResult.estimated_delivery_date || 'TBD'
                }
            });

        } catch (error) {
            console.error('Create complete shipment error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to create complete shipment",
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

            // Update order if tracking found
            if (tracking && tracking.tracking_data && tracking.tracking_data.track_status) {
                const order = await Order.findOne({ 'shipment.awb_code': awb });
                if (order) {
                    await Order.findByIdAndUpdate(order._id, {
                        'shipment.status': tracking.tracking_data.track_status,
                        'shipment.current_status': tracking.tracking_data.current_status
                    });
                }
            }

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

            // Update order status if cancellation successful
            if (result.status_code === 200) {
                await Order.findOneAndUpdate(
                    { 'shipment.awb_code': awb },
                    { 
                        status: 'cancelled',
                        'shipment.status': 'CANCELLED'
                    }
                );
            }

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