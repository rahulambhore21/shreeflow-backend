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

    /* Save Shiprocket Integration */
    async saveShiprocketIntegration(req, res) {
        try {
            const { email, token } = req.body;

            if (!email || !token) {
                return res.status(400).json({
                    type: "error",
                    message: "Email and token are required"
                });
            }

            // Find existing integration or create new one
            let integration = await ShiprocketIntegration.findOne();
            
            if (integration) {
                // Update existing integration
                integration.email = email;
                integration.token = token;
                integration.isActive = true;
                await integration.save();
            } else {
                // Create new integration
                integration = new ShiprocketIntegration({
                    email,
                    token,
                    isActive: true
                });
                await integration.save();
            }

            res.status(200).json({
                type: "success",
                message: "Shiprocket integration settings saved successfully",
                data: {
                    email: integration.email,
                    isActive: integration.isActive
                }
            });

        } catch (error) {
            console.error('Save Shiprocket integration error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to save Shiprocket integration settings",
                error: error.message
            });
        }
    },

    /* Get Shiprocket Integration */
    async getShiprocketIntegration(req, res) {
        try {
            const integration = await ShiprocketIntegration.findOne().select('email isActive createdAt updatedAt');

            if (!integration) {
                return res.status(200).json({
                    type: "success",
                    data: null,
                    message: "No Shiprocket integration configured"
                });
            }

            res.status(200).json({
                type: "success",
                data: integration
            });

        } catch (error) {
            console.error('Get Shiprocket integration error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to fetch Shiprocket integration settings",
                error: error.message
            });
        }
    }
};

module.exports = ShippingController;