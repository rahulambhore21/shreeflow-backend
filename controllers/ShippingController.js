const { ShippingRate, ShippingZone, ShiprocketIntegration } = require('../models/Shipping');

const ShippingController = {

    /* Get all shipping rates */
    async getShippingRates(req, res) {
        try {
            const rates = await ShippingRate.find().sort({ createdAt: -1 });
            
            res.status(200).json({
                type: "success",
                data: rates
            });
        } catch (error) {
            console.error('Get shipping rates error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to fetch shipping rates",
                error: error.message
            });
        }
    },

    /* Create shipping rate */
    async createShippingRate(req, res) {
        try {
            const { name, description, baseRate, perKmRate, freeShippingThreshold, estimatedDays } = req.body;

            // Validate required fields
            if (!name || !description || baseRate === undefined || perKmRate === undefined || 
                freeShippingThreshold === undefined || !estimatedDays) {
                return res.status(400).json({
                    type: "error",
                    message: "All fields are required"
                });
            }

            const shippingRate = new ShippingRate({
                name,
                description,
                baseRate: parseFloat(baseRate),
                perKmRate: parseFloat(perKmRate),
                freeShippingThreshold: parseFloat(freeShippingThreshold),
                estimatedDays,
                active: true
            });

            await shippingRate.save();

            res.status(201).json({
                type: "success",
                message: "Shipping rate created successfully",
                data: shippingRate
            });
        } catch (error) {
            console.error('Create shipping rate error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to create shipping rate",
                error: error.message
            });
        }
    },

    /* Update shipping rate */
    async updateShippingRate(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const shippingRate = await ShippingRate.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            );

            if (!shippingRate) {
                return res.status(404).json({
                    type: "error",
                    message: "Shipping rate not found"
                });
            }

            res.status(200).json({
                type: "success",
                message: "Shipping rate updated successfully",
                data: shippingRate
            });
        } catch (error) {
            console.error('Update shipping rate error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to update shipping rate",
                error: error.message
            });
        }
    },

    /* Toggle shipping rate status */
    async toggleShippingRateStatus(req, res) {
        try {
            const { id } = req.params;

            const shippingRate = await ShippingRate.findById(id);
            if (!shippingRate) {
                return res.status(404).json({
                    type: "error",
                    message: "Shipping rate not found"
                });
            }

            shippingRate.active = !shippingRate.active;
            await shippingRate.save();

            res.status(200).json({
                type: "success",
                message: `Shipping rate ${shippingRate.active ? 'activated' : 'deactivated'} successfully`,
                data: shippingRate
            });
        } catch (error) {
            console.error('Toggle shipping rate status error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to toggle shipping rate status",
                error: error.message
            });
        }
    },

    /* Delete shipping rate */
    async deleteShippingRate(req, res) {
        try {
            const { id } = req.params;

            const shippingRate = await ShippingRate.findByIdAndDelete(id);
            if (!shippingRate) {
                return res.status(404).json({
                    type: "error",
                    message: "Shipping rate not found"
                });
            }

            res.status(200).json({
                type: "success",
                message: "Shipping rate deleted successfully"
            });
        } catch (error) {
            console.error('Delete shipping rate error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to delete shipping rate",
                error: error.message
            });
        }
    },

    /* Get all shipping zones */
    async getShippingZones(req, res) {
        try {
            const zones = await ShippingZone.find().sort({ createdAt: -1 });
            
            res.status(200).json({
                type: "success",
                data: zones
            });
        } catch (error) {
            console.error('Get shipping zones error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to fetch shipping zones",
                error: error.message
            });
        }
    },

    /* Create shipping zone */
    async createShippingZone(req, res) {
        try {
            const { name, states, rate, estimatedDays } = req.body;

            // Validate required fields
            if (!name || !states || !Array.isArray(states) || states.length === 0 || 
                rate === undefined || !estimatedDays) {
                return res.status(400).json({
                    type: "error",
                    message: "Name, states array, rate, and estimated days are required"
                });
            }

            const shippingZone = new ShippingZone({
                name,
                states,
                rate: parseFloat(rate),
                estimatedDays,
                active: true
            });

            await shippingZone.save();

            res.status(201).json({
                type: "success",
                message: "Shipping zone created successfully",
                data: shippingZone
            });
        } catch (error) {
            console.error('Create shipping zone error:', error);
            if (error.code === 11000) {
                return res.status(400).json({
                    type: "error",
                    message: "Shipping zone with this name already exists"
                });
            }
            res.status(500).json({
                type: "error",
                message: "Failed to create shipping zone",
                error: error.message
            });
        }
    },

    /* Update shipping zone */
    async updateShippingZone(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const shippingZone = await ShippingZone.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            );

            if (!shippingZone) {
                return res.status(404).json({
                    type: "error",
                    message: "Shipping zone not found"
                });
            }

            res.status(200).json({
                type: "success",
                message: "Shipping zone updated successfully",
                data: shippingZone
            });
        } catch (error) {
            console.error('Update shipping zone error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to update shipping zone",
                error: error.message
            });
        }
    },

    /* Delete shipping zone */
    async deleteShippingZone(req, res) {
        try {
            const { id } = req.params;

            const shippingZone = await ShippingZone.findByIdAndDelete(id);
            if (!shippingZone) {
                return res.status(404).json({
                    type: "error",
                    message: "Shipping zone not found"
                });
            }

            res.status(200).json({
                type: "success",
                message: "Shipping zone deleted successfully"
            });
        } catch (error) {
            console.error('Delete shipping zone error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to delete shipping zone",
                error: error.message
            });
        }
    },

    /* Calculate shipping cost */
    async calculateShippingCost(req, res) {
        try {
            const { state, pincode, orderAmount, totalWeight } = req.body;

            if (!state || !orderAmount) {
                return res.status(400).json({
                    type: "error",
                    message: "State and order amount are required"
                });
            }

            // First check if order qualifies for free shipping
            const activeRates = await ShippingRate.find({ active: true });
            const freeShippingRate = activeRates.find(rate => orderAmount >= rate.freeShippingThreshold);
            
            if (freeShippingRate) {
                return res.status(200).json({
                    type: "success",
                    data: {
                        shippingCost: 0,
                        estimatedDays: freeShippingRate.estimatedDays,
                        message: "Free shipping eligible!"
                    }
                });
            }

            // Find shipping zone for the state
            const shippingZone = await ShippingZone.findOne({ 
                states: { $in: [state] }, 
                active: true 
            });

            if (shippingZone) {
                return res.status(200).json({
                    type: "success",
                    data: {
                        shippingCost: shippingZone.rate,
                        estimatedDays: shippingZone.estimatedDays,
                        zoneName: shippingZone.name
                    }
                });
            }

            // Default fallback rate
            const defaultRate = activeRates[0];
            if (defaultRate) {
                const calculatedCost = defaultRate.baseRate + (totalWeight || 1) * defaultRate.perKmRate;
                return res.status(200).json({
                    type: "success",
                    data: {
                        shippingCost: calculatedCost,
                        estimatedDays: defaultRate.estimatedDays,
                        message: "Default shipping rate applied"
                    }
                });
            }

            res.status(404).json({
                type: "error",
                message: "No shipping rates configured"
            });

        } catch (error) {
            console.error('Calculate shipping cost error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to calculate shipping cost",
                error: error.message
            });
        }
    },

    /* ✅ PRODUCTION SAFE: Login to Shiprocket (no password storage) */
    async saveShiprocketIntegration(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    type: "error",
                    message: "Email and password are required"
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    type: "error",
                    message: "Please provide a valid email address"
                });
            }

            // ✅ SECURITY: Login once, get token, store only token + expiry
            const shiprocketService = require('../services/shiprocketService');
            const result = await shiprocketService.performLogin(email, password);

            res.status(200).json({
                type: "success",
                message: "Shiprocket authentication successful",
                data: {
                    email: email,
                    isActive: true,
                    pickup_locations: result.pickup_locations,
                    connected_at: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Shiprocket authentication error:', {
                email: req.body.email,
                error: error.message
            });
            
            res.status(400).json({
                type: "error",
                message: error.message || "Failed to authenticate with Shiprocket"
            });
        }
    },

    /* Get Shiprocket Integration */
    async getShiprocketIntegration(req, res) {
        try {
            const integration = await ShiprocketIntegration.findOne().select('email isActive lastAuthenticated tokenExpiry createdAt updatedAt');

            if (!integration) {
                return res.status(200).json({
                    type: "success",
                    data: null,
                    message: "No Shiprocket integration configured"
                });
            }

            // ✅ SAFE: Don't expose token, show only status
            const response = {
                email: integration.email,
                isActive: integration.isActive,
                lastAuthenticated: integration.lastAuthenticated,
                tokenValid: integration.tokenExpiry && new Date(integration.tokenExpiry) > new Date(),
                createdAt: integration.createdAt,
                updatedAt: integration.updatedAt
            };

            res.status(200).json({
                type: "success",
                data: response
            });

        } catch (error) {
            console.error('Get Shiprocket integration error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to fetch Shiprocket integration settings",
                error: error.message
            });
        }
    },

    /* ✅ NEW: Check Shiprocket Status */
    async checkShiprocketStatus(req, res) {
        try {
            const shiprocketService = require('../services/shiprocketService');
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
    },

    /* Calculate shipping cost for checkout */
    async calculateShippingForCheckout(req, res) {
        try {
            const shiprocketService = require('../services/shiprocketService');
            const { delivery_postcode, weight, cod, order_amount } = req.body;

            // Validate required fields
            if (!delivery_postcode || !weight || !order_amount) {
                return res.status(400).json({
                    type: "error",
                    message: "delivery_postcode, weight, and order_amount are required"
                });
            }

            // Default pickup postcode - you should store this in env or config
            const pickup_postcode = process.env.PICKUP_POSTCODE || '400001';

            console.log('📦 Calculating shipping for checkout:', {
                delivery_postcode,
                weight,
                cod: cod ? 1 : 0,
                order_amount
            });

            // Get shipping rates from Shiprocket
            const rates = await shiprocketService.getShippingRates({
                pickup_postcode,
                delivery_postcode,
                weight: parseFloat(weight),
                length: 10,
                breadth: 10,
                height: 5,
                cod: cod ? 1 : 0,
                order_amount: parseFloat(order_amount)
            });

            if (!rates || !rates.data || !rates.data.available_courier_companies) {
                return res.status(200).json({
                    type: "success",
                    data: {
                        available: false,
                        message: "Shipping not available for this location",
                        shipping_charge: 0
                    }
                });
            }

            // Get the cheapest available courier
            const couriers = rates.data.available_courier_companies;
            if (couriers.length === 0) {
                return res.status(200).json({
                    type: "success",
                    data: {
                        available: false,
                        message: "No couriers available for this location",
                        shipping_charge: 0
                    }
                });
            }

            // Sort by freight_charge and get cheapest
            const sortedCouriers = couriers.sort((a, b) => 
                (a.freight_charge || 0) - (b.freight_charge || 0)
            );

            const cheapestCourier = sortedCouriers[0];
            const shippingCharge = parseFloat(cheapestCourier.freight_charge || 0);

            console.log('✅ Shipping calculation result:', {
                courier: cheapestCourier.courier_name,
                charge: shippingCharge,
                etd: cheapestCourier.etd
            });

            res.status(200).json({
                type: "success",
                data: {
                    available: true,
                    shipping_charge: shippingCharge,
                    courier_name: cheapestCourier.courier_name,
                    estimated_delivery_days: cheapestCourier.etd,
                    all_couriers: sortedCouriers.map(c => ({
                        name: c.courier_name,
                        charge: c.freight_charge,
                        etd: c.etd
                    }))
                }
            });

        } catch (error) {
            console.error('Calculate shipping error:', error);
            
            // If Shiprocket is not configured, return zero shipping
            if (error.message.includes('not configured') || error.message === 'TOKEN_EXPIRED') {
                return res.status(200).json({
                    type: "success",
                    data: {
                        available: false,
                        message: "Shiprocket integration not configured. Shipping charges will be calculated later.",
                        shipping_charge: 0
                    }
                });
            }

            res.status(500).json({
                type: "error",
                message: "Failed to calculate shipping cost",
                error: error.message
            });
        }
    }
};

module.exports = ShippingController;