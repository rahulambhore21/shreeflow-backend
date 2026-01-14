const axios = require('axios');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null;
    }

    async authenticate() {
        try {
            if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.token;
            }

            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_PASSWORD
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
}

module.exports = new ShiprocketService();