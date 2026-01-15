const axios = require('axios');
const { ShiprocketIntegration } = require('../models/Shipping');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null;
    }

    // Get stored integration details
    async getIntegration() {
        const integration = await ShiprocketIntegration.findOne({ isActive: true });
        if (!integration) {
            throw new Error('Shiprocket integration not configured');
        }
        return integration;
    }

    async authenticate() {
        try {
            if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.token;
            }

            const integration = await this.getIntegration();

            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email: integration.email,
                password: integration.token // Using token as password for now
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                // Token expires in 10 days, set expiry to 9 days to be safe
                this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
                return this.token;
            }

            throw new Error('Failed to get authentication token');
        } catch (error) {
            console.error('Shiprocket authentication error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Shiprocket');
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const token = await this.authenticate();
            
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Shiprocket API error (${endpoint}):`, error.response?.data || error.message);
            throw error;
        }
    }

    // Calculate shipping rates
    async getShippingRates(data) {
        const {
            pickup_postcode,
            delivery_postcode,
            weight,
            length,
            breadth,
            height
        } = data;

        const endpoint = `/courier/serviceability`;
        const params = new URLSearchParams({
            pickup_postcode,
            delivery_postcode,
            weight,
            length,
            breadth,
            height
        });

        return this.makeRequest(`${endpoint}?${params}`);
    }

    // Create order
    async createOrder(orderData) {
        const {
            order_id,
            order_date,
            pickup_location,
            channel_id,
            comment,
            reseller_name,
            company_name,
            billing_customer_name,
            billing_last_name,
            billing_address,
            billing_address_2,
            billing_city,
            billing_pincode,
            billing_state,
            billing_country,
            billing_email,
            billing_phone,
            shipping_is_billing,
            shipping_customer_name,
            shipping_last_name,
            shipping_address,
            shipping_address_2,
            shipping_city,
            shipping_pincode,
            shipping_state,
            shipping_country,
            shipping_email,
            shipping_phone,
            order_items,
            payment_method,
            shipping_charges,
            giftwrap_charges,
            transaction_charges,
            total_discount,
            sub_total,
            length,
            breadth,
            height,
            weight
        } = orderData;

        return this.makeRequest('/orders/create/adhoc', 'POST', {
            order_id,
            order_date,
            pickup_location,
            channel_id,
            comment,
            reseller_name,
            company_name,
            billing_customer_name,
            billing_last_name,
            billing_address,
            billing_address_2,
            billing_city,
            billing_pincode,
            billing_state,
            billing_country,
            billing_email,
            billing_phone,
            shipping_is_billing,
            shipping_customer_name,
            shipping_last_name,
            shipping_address,
            shipping_address_2,
            shipping_city,
            shipping_pincode,
            shipping_state,
            shipping_country,
            shipping_email,
            shipping_phone,
            order_items,
            payment_method,
            shipping_charges,
            giftwrap_charges,
            transaction_charges,
            total_discount,
            sub_total,
            length,
            breadth,
            height,
            weight
        });
    }

    // Generate AWB (Air Waybill)
    async generateAWB(shipment_id, courier_id) {
        return this.makeRequest('/courier/assign/awb', 'POST', {
            shipment_id,
            courier_id
        });
    }

    // Track shipment
    async trackShipment(awb) {
        return this.makeRequest(`/courier/track/awb/${awb}`);
    }

    // Get pickup locations
    async getPickupLocations() {
        return this.makeRequest('/settings/company/pickup');
    }

    // Create pickup location
    async createPickupLocation() {
        const pickupData = {
            pickup_location: "Primary",
            name: "Shree Flow",
            email: "support@shreeflow.com",
            phone: "9999999999",
            address: "Mumbai Office",
            address_2: "",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            pin_code: "400001"
        };
        
        try {
            const result = await this.makeRequest('/settings/company/pickup', 'POST', pickupData);
            console.log('Pickup location created:', result);
            return result;
        } catch (error) {
            console.error('Failed to create pickup location:', error.message);
            throw error;
        }
    }

    // Get available couriers
    async getAvailableCouriers(data) {
        const {
            pickup_postcode,
            delivery_postcode,
            weight,
            length,
            breadth,
            height
        } = data;

        return this.makeRequest('/courier/serviceability', 'GET', null);
    }

    // Cancel shipment
    async cancelShipment(awb) {
        return this.makeRequest('/orders/cancel/shipment/awbs', 'POST', {
            awbs: [awb]
        });
    }

    // Get order details
    async getOrderDetails(order_id) {
        return this.makeRequest(`/orders/show/${order_id}`);
    }

    // Create return order
    async createReturn(data) {
        return this.makeRequest('/orders/create/return', 'POST', data);
    }

    // Get shipping label
    async getShippingLabel(shipment_ids) {
        return this.makeRequest('/orders/print/label', 'POST', {
            shipment_ids
        });
    }

    // Get manifest
    async getManifest(shipment_ids) {
        return this.makeRequest('/orders/print/manifest', 'POST', {
            shipment_ids
        });
    }

    // Get invoice
    async getInvoice(order_ids) {
        return this.makeRequest('/orders/print/invoice', 'POST', {
            ids: order_ids
        });
    }

    // Helper method to create order from our order format
    async createOrderFromOurFormat(order) {
        try {
            console.log('Order data received:', JSON.stringify(order, null, 2));
            
            // First, ensure we have a pickup location
            try {
                const pickupLocations = await this.getPickupLocations();
                console.log('Available pickup locations:', pickupLocations);
                
                // If no pickup locations, create one
                if (!pickupLocations.data || !pickupLocations.data.shipping_address) {
                    console.log('No pickup location found, creating one...');
                    await this.createPickupLocation();
                }
            } catch (err) {
                console.log('Could not fetch/create pickup locations:', err.message);
            }
            
            // Validate required fields
            if (!order || !order.products || order.products.length === 0) {
                throw new Error('Invalid order data: No products found');
            }

            // Handle different order formats - extract customer info
            let customerInfo = {};
            if (order.customer && typeof order.customer === 'object' && Object.keys(order.customer).length > 0) {
                // Standard format with customer object
                customerInfo = order.customer;
            } else {
                // Fallback: Create customer info from available data or defaults
                customerInfo = {
                    name: 'Guest Customer',
                    email: 'guest@shreeflow.com',
                    phone: '9999999999'
                };
                console.log('Using fallback customer info:', customerInfo);
            }

            // Handle address format
            let addressInfo = {};
            if (order.address && typeof order.address === 'object') {
                // Standard format with address object
                addressInfo = order.address;
            } else if (typeof order.address === 'string') {
                // String format - parse or use defaults
                const addressParts = order.address.split(',').map(s => s.trim());
                addressInfo = {
                    street: addressParts[0] || 'Address',
                    city: addressParts[1] || 'Mumbai',
                    state: addressParts[2] || 'Maharashtra',
                    zipCode: '400001',
                    country: 'India'
                };
                console.log('Parsed address from string:', addressInfo);
            } else {
                // No address info - use defaults
                addressInfo = {
                    street: 'Default Address',
                    city: 'Mumbai',
                    state: 'Maharashtra', 
                    zipCode: '400001',
                    country: 'India'
                };
                console.log('Using fallback address info:', addressInfo);
            }

            // Check if products are populated, if not create basic items
            const orderItems = order.products.map((item, index) => {
                const product = item.productId;
                if (!product || typeof product === 'string' || product === null) {
                    console.log(`Product not populated for item ${index}, using defaults`);
                    return {
                        name: 'Water Level Controller',
                        sku: `SKU-${index + 1}`,
                        units: item.quantity,
                        selling_price: Math.floor(order.amount / order.products.length), // Divide total amount
                        discount: 0,
                        tax: 0,
                        hsn: 441122
                    };
                }
                
                return {
                    name: product.title || 'Product',
                    sku: product.sku || `SKU-${product._id}`,
                    units: item.quantity,
                    selling_price: product.price,
                    discount: 0,
                    tax: 0,
                    hsn: 441122
                };
            });

            const totalWeight = order.products.reduce((total, item) => total + (item.quantity * 0.5), 0);

            // Ensure customerInfo has required fields with safety checks
            const safeName = customerInfo.name || 'Guest Customer';
            const safeEmail = customerInfo.email || 'guest@shreeflow.com';
            const safePhone = customerInfo.phone || '9999999999';

            const orderData = {
                order_id: order._id.toString(),
                order_date: order.createdAt.toISOString().split('T')[0],
                pickup_location: "Primary",
                comment: "Water Level Controller Order",
                billing_customer_name: safeName.split(' ')[0] || safeName,
                billing_last_name: safeName.split(' ').slice(1).join(' ') || "",
                billing_address: addressInfo.street,
                billing_city: addressInfo.city,
                billing_pincode: addressInfo.zipCode.toString(),
                billing_state: addressInfo.state,
                billing_country: addressInfo.country,
                billing_email: safeEmail,
                billing_phone: safePhone.toString(),
                shipping_customer_name: safeName.split(' ')[0] || safeName,
                shipping_last_name: safeName.split(' ').slice(1).join(' ') || "",
                shipping_address: addressInfo.street,
                shipping_city: addressInfo.city,
                shipping_pincode: addressInfo.zipCode.toString(),
                shipping_state: addressInfo.state,
                shipping_country: addressInfo.country,
                shipping_email: safeEmail,
                shipping_phone: safePhone.toString(),
                order_items: orderItems,
                payment_method: order.razorpay_payment_id ? "Prepaid" : "COD",
                sub_total: order.amount,
                length: 20,
                breadth: 15,  
                height: 10,
                weight: totalWeight
            };

            console.log('Final orderData for Shiprocket:', JSON.stringify(orderData, null, 2));
            return this.createOrder(orderData);
        } catch (error) {
            console.error('Error creating Shiprocket order from our format:', error);
            throw error;
        }
    }

    // Check integration status
    async checkIntegrationStatus() {
        try {
            const locations = await this.getPickupLocations();
            return {
                status: 'connected',
                pickupLocations: locations.data || [],
                message: 'Shiprocket integration is active'
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Shiprocket integration failed',
                error: error.message
            };
        }
    }

    // Check integration status
    async checkIntegrationStatus() {
        try {
            const integration = await this.getIntegration();
            const token = await this.authenticate();
            
            return {
                connected: true,
                email: integration.email,
                lastConnected: new Date()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }
}

module.exports = new ShiprocketService();