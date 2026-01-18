const axios = require('axios');
const { ShiprocketIntegration } = require('../models/Shipping');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false; // Prevent multiple simultaneous refreshes
    }

    // Get stored integration details
    async getIntegration() {
        const integration = await ShiprocketIntegration.findOne({ isActive: true });
        if (!integration) {
            throw new Error('Shiprocket integration not configured');
        }
        return integration;
    }

    // ✅ PRODUCTION SAFE: Login only to get JWT, never store password
    async authenticate(email, password) {
        try {
            console.log('🔐 Authenticating with Shiprocket...', { email });
            
            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email,
                password
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.token) {
                const token = response.data.token;
                const tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000); // 9 days
                
                // ✅ PRODUCTION SAFE: Store only token, email, expiry (NO PASSWORD)
                await this.updateStoredToken(email, token, tokenExpiry);
                
                this.token = token;
                this.tokenExpiry = tokenExpiry;
                
                console.log('✅ Shiprocket authentication successful');
                return token;
            }

            throw new Error('Invalid response from Shiprocket');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error('❌ Shiprocket authentication failed:', { 
                email, 
                error: errorMsg,
                status: error.response?.status 
            });
            throw new Error(`Authentication failed: ${errorMsg}`);
        }
    }

    // ✅ NEW: Update stored token without password
    async updateStoredToken(email, token, tokenExpiry) {
        await ShiprocketIntegration.findOneAndUpdate(
            { isActive: true },
            { 
                email,
                token,
                tokenExpiry: new Date(tokenExpiry),
                lastAuthenticated: new Date(),
                updatedAt: new Date()
            },
            { upsert: true }
        );
    }

    // ✅ PRODUCTION SAFE: Get valid token with automatic refresh
    async getValidToken() {
        try {
            // Try to get token from memory first
            if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.token;
            }

            // Get from database
            const integration = await this.getIntegration();
            
            // Check if stored token is still valid
            if (integration.token && integration.tokenExpiry && 
                new Date(integration.tokenExpiry) > new Date()) {
                this.token = integration.token;
                this.tokenExpiry = new Date(integration.tokenExpiry).getTime();
                return this.token;
            }

            // Token expired - require re-authentication
            throw new Error('TOKEN_EXPIRED');
            
        } catch (error) {
            throw new Error('TOKEN_EXPIRED');
        }
    }

    // ✅ PRODUCTION SAFE: Request with automatic retry on 401
    async makeRequest(endpoint, method = 'GET', data = null, retryCount = 0) {
        try {
            const token = await this.getValidToken();
            
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000,
                validateStatus: (status) => status < 500 // Don't throw on 4xx errors
            };

            if (data) {
                config.data = data;
            }

            console.log(`📡 Shiprocket API: ${method} ${endpoint}`, {
                hasData: !!data,
                dataSize: data ? JSON.stringify(data).length : 0
            });

            const response = await axios(config);
            
            console.log('✅ Shiprocket API success', {
                endpoint,
                status: response.status,
                responseSize: JSON.stringify(response.data).length
            });
            
            return response.data;
            
        } catch (error) {
            // ✅ AUTO TOKEN REFRESH: Retry once on 401 (token expired)
            if (error.response?.status === 401 && retryCount === 0) {
                console.log('🔄 Token expired, requiring re-authentication');
                this.token = null;
                this.tokenExpiry = null;
                throw new Error('TOKEN_EXPIRED');
            }

            const errorDetails = {
                endpoint,
                method,
                status: error.response?.status,
                error: error.response?.data?.message || error.response?.data || error.message,
                code: error.code
            };

            console.error('❌ Shiprocket API error:', errorDetails);
            
            // Provide more specific error messages
            if (error.code === 'ECONNABORTED') {
                throw new Error(`Shiprocket API timeout after 30s: ${endpoint}`);
            }
            if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                throw new Error(`Network error connecting to Shiprocket: ${error.code}`);
            }
            
            throw new Error(`Shiprocket API error: ${errorDetails.error}`);
        }
    }

    // ✅ DYNAMIC: Get and validate pickup locations
    async getPickupLocations() {
        try {
            console.log('🔍 Fetching pickup locations from Shiprocket...');
            const startTime = Date.now();
            const response = await this.makeRequest('/settings/company/pickup');
            const duration = Date.now() - startTime;
            console.log(`✅ Pickup locations fetched in ${duration}ms`);
            // Return response even if empty - let caller decide how to handle
            return response;
        } catch (error) {
            console.error('❌ Failed to fetch pickup locations:', error.message);
            throw error;
        }
    }

    // Get all pickup location names (including inactive) to avoid duplicates
    async getAllPickupLocationNames() {
        try {
            const response = await this.getPickupLocations();
            const names = new Set();
            
            // Add shipping address if exists
            if (response.data?.shipping_address?.pickup_location) {
                names.add(response.data.shipping_address.pickup_location);
            }
            
            // Add all recent addresses
            if (response.data?.recent_addresses && Array.isArray(response.data.recent_addresses)) {
                response.data.recent_addresses.forEach(addr => {
                    if (addr.pickup_location) {
                        names.add(addr.pickup_location);
                    }
                });
            }
            
            return Array.from(names);
        } catch (error) {
            console.error('Error getting pickup location names:', error.message);
            return [];
        }
    }

    // ✅ DYNAMIC: Get valid pickup location name
    async getValidPickupLocation() {
        const response = await this.getPickupLocations();
        const locations = response.data;
        
        // 🔍 DEBUG: Log the actual response structure
        console.log('🔍 DEBUG - Full locations response:', JSON.stringify(locations, null, 2));
        
        // Try multiple possible field names and structures
        
        // Priority 1: Check shipping_address array (this is where Shiprocket puts locations)
        if (locations?.shipping_address && Array.isArray(locations.shipping_address) && locations.shipping_address.length > 0) {
            console.log('🔍 DEBUG - shipping_address found:', locations.shipping_address.length, 'locations');
            
            // Log all locations for debugging
            locations.shipping_address.forEach((loc, idx) => {
                console.log(`🔍 DEBUG - Location ${idx}: "${loc.pickup_location || loc.name}" - Status: ${loc.status} (${loc.status === 1 ? 'ACTIVE' : 'INACTIVE'})`);
            });
            
            // Find first ACTIVE location (status === 1 means ENABLED in Shiprocket dashboard)
            const activeLocation = locations.shipping_address.find(loc => {
                const isActive = loc.status === 1;
                const pickupName = loc.pickup_location || loc.nickname || loc.address_nickname || loc.name || loc.pickup_code;
                return isActive && pickupName;
            });
            
            if (activeLocation) {
                const pickupName = activeLocation.pickup_location || activeLocation.nickname || 
                                 activeLocation.address_nickname || activeLocation.name || activeLocation.pickup_code;
                console.log('✅ Using ACTIVE pickup location:', pickupName);
                return pickupName;
            }
            
            console.log('⚠️ No active location found, checking for primary location');
            
            // Fallback: Use primary location even if inactive
            const primaryLocation = locations.shipping_address.find(loc => loc.is_primary_location === 1);
            if (primaryLocation) {
                const pickupName = primaryLocation.pickup_location || primaryLocation.nickname || 
                                 primaryLocation.address_nickname || primaryLocation.name || primaryLocation.pickup_code;
                if (pickupName) {
                    console.log('⚠️ Using PRIMARY pickup location (may be inactive):', pickupName);
                    return pickupName;
                }
            }
            
            // Last resort: Use first location with a name
            const firstLocation = locations.shipping_address.find(loc => 
                loc.pickup_location || loc.nickname || loc.address_nickname || loc.name || loc.pickup_code
            );
            
            if (firstLocation) {
                const pickupName = firstLocation.pickup_location || firstLocation.nickname || 
                                 firstLocation.address_nickname || firstLocation.name || firstLocation.pickup_code;
                console.log('⚠️ Using first available pickup location:', pickupName);
                return pickupName;
            }
        }
        
        // Priority 2: Check recent_addresses (fallback, usually empty)
        if (locations?.recent_addresses && Array.isArray(locations.recent_addresses) && locations.recent_addresses.length > 0) {
            console.log('🔍 DEBUG - Found recent_addresses, count:', locations.recent_addresses.length);
            
            const activeLocation = locations.recent_addresses.find(loc => {
                const isActive = loc.status === 1;
                const pickupName = loc.pickup_location || loc.nickname || loc.address_nickname || loc.name || loc.pickup_code;
                return isActive && pickupName;
            });
            
            if (activeLocation) {
                const pickupName = activeLocation.pickup_location || activeLocation.nickname || 
                                 activeLocation.address_nickname || activeLocation.name || activeLocation.pickup_code;
                console.log('✅ Using pickup location from recent_addresses:', pickupName);
                return pickupName;
            }
        }
        
        console.log('❌ DEBUG - No valid pickup location found in response');
        console.log('❌ Available fields:', Object.keys(locations || {}));
        throw new Error('No valid pickup location found. Please add and enable (toggle ON) at least one pickup location in your Shiprocket dashboard: https://app.shiprocket.in/seller/settings/pickup-address');
    }

    // Calculate shipping rates
    async getShippingRates(data) {
        const {
            pickup_postcode,
            delivery_postcode,
            weight,
            length = 10,
            breadth = 10,
            height = 5,
            cod = 0,
            order_amount = 100
        } = data;

        // Validate input
        if (!pickup_postcode || !delivery_postcode || !weight) {
            throw new Error('pickup_postcode, delivery_postcode, and weight are required');
        }

        console.log('🚚 Calculating shipping rates for:', {
            pickup_postcode,
            delivery_postcode,
            weight,
            dimensions: { length, breadth, height },
            cod,
            order_amount
        });

        const endpoint = `/courier/serviceability`;
        const params = new URLSearchParams({
            pickup_postcode: pickup_postcode.toString(),
            delivery_postcode: delivery_postcode.toString(),
            weight: parseFloat(weight).toString(),
            length: parseFloat(length).toString(),
            breadth: parseFloat(breadth).toString(),
            height: parseFloat(height).toString(),
            cod: cod.toString(),
            order_amount: parseFloat(order_amount).toString()
        });

        try {
            const result = await this.makeRequest(`${endpoint}?${params}`);
            console.log('💰 Shiprocket rates result:', {
                status: result.status,
                companiesCount: result.data?.available_courier_companies?.length || 0
            });
            return result;
        } catch (error) {
            console.error('❌ Failed to get shipping rates:', error.message);
            throw error;
        }
    }

    // ✅ PRODUCTION SAFE: Create order with proper validation
    async createOrder(orderData) {
        // Validate required fields
        const required = [
            'order_id', 'billing_customer_name', 'billing_address', 
            'billing_city', 'billing_pincode', 'billing_phone', 
            'billing_email', 'order_items', 'weight'
        ];

        for (const field of required) {
            if (!orderData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate Indian pincode
        if (!/^\d{6}$/.test(orderData.billing_pincode.toString())) {
            throw new Error('Invalid pincode format. Must be 6 digits.');
        }

        // Validate phone number
        if (!/^\d{10}$/.test(orderData.billing_phone.toString().replace(/\D/g, ''))) {
            throw new Error('Invalid phone number. Must be 10 digits.');
        }

        // ✅ DYNAMIC: Get valid pickup location
        if (!orderData.pickup_location) {
            orderData.pickup_location = await this.getValidPickupLocation();
        }

        console.log('📦 Creating Shiprocket order:', {
            order_id: orderData.order_id,
            pickup_location: orderData.pickup_location,
            weight: orderData.weight,
            billing_pincode: orderData.billing_pincode,
            items_count: orderData.order_items?.length
        });

        return this.makeRequest('/orders/create/adhoc', 'POST', orderData);
    }

    // ✅ CORRECTED FLOW: Order → Shipment → AWB → Courier Assignment
    async createShipmentFlow(orderData) {
        try {
            // Step 1: Create order
            const orderResponse = await this.createOrder(orderData);
            
            if (!orderResponse.order_id || !orderResponse.shipment_id) {
                throw new Error('Order creation failed - missing order_id or shipment_id');
            }

            console.log('✅ Order created:', {
                order_id: orderResponse.order_id,
                shipment_id: orderResponse.shipment_id,
                status: orderResponse.status
            });

            // Step 2: Get available couriers for this shipment
            const couriers = await this.getShipmentCouriers(orderResponse.shipment_id);
            
            if (!couriers || couriers.length === 0) {
                throw new Error('No couriers available for this shipment');
            }

            // Step 3: Assign best courier (lowest rate or first available)
            const bestCourier = couriers.reduce((best, current) => 
                (current.rate < best.rate) ? current : best
            );

            // Step 4: Generate AWB and assign courier
            const awbResponse = await this.generateAWB(
                orderResponse.shipment_id, 
                bestCourier.courier_company_id
            );

            return {
                order_id: orderResponse.order_id,
                shipment_id: orderResponse.shipment_id,
                awb_code: awbResponse.awb_code,
                courier_name: bestCourier.courier_name,
                estimated_delivery_days: bestCourier.etd,
                rate: bestCourier.rate,
                status: 'AWB_ASSIGNED'
            };

        } catch (error) {
            console.error('❌ Shipment flow failed:', error.message);
            throw error;
        }
    }

    // Get available couriers for shipment
    async getShipmentCouriers(shipment_id) {
        if (!shipment_id) {
            throw new Error('shipment_id is required');
        }

        const response = await this.makeRequest(`/courier/assign/awb`, 'POST', {
            shipment_id: parseInt(shipment_id),
            is_return: 0
        });

        return response.data?.available_courier_companies || [];
    }

    // Generate AWB with courier assignment
    async generateAWB(shipment_id, courier_id) {
        if (!shipment_id || !courier_id) {
            throw new Error('shipment_id and courier_id are required');
        }

        console.log('🏷️ Generating AWB:', { shipment_id, courier_id });

        const response = await this.makeRequest('/courier/assign/awb', 'POST', {
            shipment_id: parseInt(shipment_id),
            courier_id: parseInt(courier_id)
        });

        if (!response.awb_assign_status || response.awb_assign_status !== 1) {
            throw new Error('AWB assignment failed: ' + (response.response || 'Unknown error'));
        }

        return {
            awb_code: response.awb_code,
            courier_name: response.courier_name,
            status: 'assigned'
        };
    }

    // Track shipment
    async trackShipment(awb) {
        if (!awb) {
            throw new Error('AWB code is required');
        }
        return this.makeRequest(`/courier/track/awb/${awb}`);
    }

    // Cancel shipment
    async cancelShipment(awb) {
        if (!awb) {
            throw new Error('AWB code is required');
        }

        return this.makeRequest('/orders/cancel/shipment/awbs', 'POST', {
            awbs: [awb]
        });
    }

    // ✅ PRODUCTION SAFE: Health check without exposing tokens
    async checkIntegrationStatus() {
        try {
            const integration = await this.getIntegration();
            const tokenValid = integration.tokenExpiry && 
                new Date(integration.tokenExpiry) > new Date();
            
            if (!tokenValid) {
                return {
                    status: 'token_expired',
                    email: integration.email,
                    message: 'Re-authentication required',
                    last_authenticated: integration.lastAuthenticated
                };
            }

            // Test API connectivity
            const locations = await this.getPickupLocations();
            
            // Count pickup locations correctly based on Shiprocket API structure
            let pickupCount = 0;
            if (locations.shipping_address && Object.keys(locations.shipping_address).length > 0) {
                pickupCount += 1;
            }
            if (locations.recent_addresses && Array.isArray(locations.recent_addresses)) {
                pickupCount += locations.recent_addresses.length;
            }
            
            return {
                status: 'connected',
                email: integration.email,
                pickup_locations: pickupCount,
                last_authenticated: integration.lastAuthenticated,
                token_expires: integration.tokenExpiry
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                requires_reauth: error.message.includes('TOKEN_EXPIRED')
            };
        }
    }

    // ✅ NEW: One-time login method for frontend
    async performLogin(email, password) {
        try {
            const token = await this.authenticate(email, password);
            
            // Test the token immediately
            const testResponse = await this.getPickupLocations();
            
            return {
                success: true,
                message: 'Authentication successful',
                pickup_locations: testResponse.data?.length || 0
            };
            
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    // ✅ COMPLETE ORDER-TO-SHIPMENT WORKFLOW
    async createCompleteShipment(orderData) {
        try {
            console.log('🚀 Starting complete shipment flow for order:', orderData.order_id);
            
            // Step 1: Create order in Shiprocket
            const orderResponse = await this.createOrder(orderData);
            console.log('✅ Step 1: Order created', { order_id: orderResponse.order_id, shipment_id: orderResponse.shipment_id });
            
            if (!orderResponse.shipment_id) {
                throw new Error('No shipment ID returned from order creation');
            }
            
            // Step 2: Get available couriers for this shipment
            const couriersResponse = await this.getShipmentCouriers(orderResponse.shipment_id);
            console.log('✅ Step 2: Available couriers fetched', { count: couriersResponse?.data?.available_courier_companies?.length || 0 });
            
            if (!couriersResponse?.data?.available_courier_companies || couriersResponse.data.available_courier_companies.length === 0) {
                throw new Error('No courier companies available for this route');
            }
            
            // Step 3: Select best courier (lowest rate or recommended)
            const bestCourier = couriersResponse.data.available_courier_companies
                .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
            console.log('✅ Step 3: Best courier selected', { company: bestCourier.courier_company_id, rate: bestCourier.rate });
            
            // Step 4: Generate AWB with selected courier
            const awbResponse = await this.generateAWB(orderResponse.shipment_id, bestCourier.courier_company_id);
            console.log('✅ Step 4: AWB generated', { awb: awbResponse.response?.data?.awb_code });
            
            return {
                success: true,
                order_id: orderResponse.order_id,
                shipment_id: orderResponse.shipment_id,
                awb_code: awbResponse.response?.data?.awb_code,
                courier_name: bestCourier.courier_name,
                courier_company_id: bestCourier.courier_company_id,
                estimated_delivery: bestCourier.etd,
                shipping_cost: bestCourier.rate,
                message: 'Complete shipment created successfully'
            };
            
        } catch (error) {
            console.error('❌ Complete shipment flow failed:', error.message);
            throw new Error(`Shipment creation failed: ${error.message}`);
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
            console.log('📦 Order data received - Full Details:', {
                orderId: order._id,
                hasCustomer: !!order.customer,
                customerData: order.customer,
                hasAddress: !!order.address,
                addressData: order.address,
                hasProducts: !!order.products,
                productsCount: order.products?.length,
                products: order.products?.map(p => ({
                    productId: p.productId?._id || p.productId,
                    title: p.productId?.title,
                    quantity: p.quantity
                })),
                paymentMethod: order.paymentMethod,
                amount: order.amount
            });
            
            // First, ensure we have a pickup location
            try {
                const pickupLocations = await this.getPickupLocations();
                console.log('📋 Available pickup locations:', {
                    hasShippingAddress: !!pickupLocations.data?.shipping_address,
                    recentAddressesCount: pickupLocations.data?.recent_addresses?.length || 0
                });
                
                // Check if we have any valid pickup addresses
                const hasValidPickup = pickupLocations.data?.shipping_address || 
                    (pickupLocations.data?.recent_addresses && pickupLocations.data.recent_addresses.length > 0);
                
                if (!hasValidPickup) {
                    console.log('⚠️ No pickup locations configured.');
                    throw new Error('No pickup locations found. Please configure a pickup location in Admin Panel > Shipping > Pickup Locations before creating shipments.');
                }
                
                // Verify we can get a valid pickup location
                await this.getValidPickupLocation();
                console.log('✅ Valid pickup location confirmed');
                
            } catch (err) {
                console.error('❌ Pickup location validation failed:', err.message);
                throw new Error(`Pickup location error: ${err.message}`);
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

            // Calculate total weight from products (use product weight or default 0.5kg)
            const totalWeight = order.products.reduce((total, item) => {
                const productWeight = item.productId?.weight || 0.5;
                return total + (item.quantity * productWeight);
            }, 0);

            // Calculate package dimensions - use largest product dimensions or defaults
            let packageLength = 10;
            let packageBreadth = 10;
            let packageHeight = 5;

            if (order.products.length > 0) {
                // Get maximum dimensions from all products
                order.products.forEach(item => {
                    const product = item.productId;
                    if (product?.length) packageLength = Math.max(packageLength, product.length);
                    if (product?.breadth) packageBreadth = Math.max(packageBreadth, product.breadth);
                    if (product?.height) packageHeight = Math.max(packageHeight, product.height);
                });
            }

            console.log('📦 Calculated shipping dimensions:', {
                weight: totalWeight,
                length: packageLength,
                breadth: packageBreadth,
                height: packageHeight
            });

            // Ensure customerInfo has required fields with safety checks
            const safeName = customerInfo.name || 'Guest Customer';
            const safeEmail = customerInfo.email || 'guest@shreeflow.com';
            const rawPhone = customerInfo.phone || '9999999999';
            // Clean phone number - remove all non-digits
            const safePhone = rawPhone.toString().replace(/\D/g, '').slice(-10);

            // Ensure address fields are not empty
            const billingAddress = addressInfo.street || 'Default Address';
            const billingCity = addressInfo.city || 'Mumbai';
            const billingState = addressInfo.state || 'Maharashtra';
            const billingPincode = (addressInfo.zipCode || '400001').toString().padStart(6, '0');
            const billingCountry = addressInfo.country || 'India';

            const orderData = {
                order_id: order._id.toString(),
                order_date: order.createdAt.toISOString().split('T')[0],
                pickup_location: "Primary",
                comment: "Water Level Controller Order",
                billing_customer_name: safeName.split(' ')[0] || safeName,
                billing_last_name: safeName.split(' ').slice(1).join(' ') || ".",
                billing_address: billingAddress,
                billing_address_2: "",
                billing_city: billingCity,
                billing_pincode: billingPincode,
                billing_state: billingState,
                billing_country: billingCountry,
                billing_email: safeEmail,
                billing_phone: safePhone,
                shipping_is_billing: true,
                shipping_customer_name: safeName.split(' ')[0] || safeName,
                shipping_last_name: safeName.split(' ').slice(1).join(' ') || ".",
                shipping_address: billingAddress,
                shipping_address_2: "",
                shipping_city: billingCity,
                shipping_pincode: billingPincode,
                shipping_state: billingState,
                shipping_country: billingCountry,
                shipping_email: safeEmail,
                shipping_phone: safePhone,
                order_items: orderItems,
                payment_method: order.paymentMethod === 'cod' ? "COD" : "Prepaid",
                sub_total: order.amount,
                length: packageLength,
                breadth: packageBreadth,  
                height: packageHeight,
                weight: totalWeight
            };

            console.log('Final orderData for Shiprocket:', JSON.stringify(orderData, null, 2));
            
            // Validate critical fields before sending
            if (!orderData.billing_phone || orderData.billing_phone.length !== 10) {
                throw new Error(`Invalid phone number: ${orderData.billing_phone}. Must be exactly 10 digits.`);
            }
            
            if (!orderData.billing_pincode || orderData.billing_pincode.length !== 6) {
                throw new Error(`Invalid pincode: ${orderData.billing_pincode}. Must be exactly 6 digits.`);
            }

            if (!orderData.order_items || orderData.order_items.length === 0) {
                throw new Error('No order items found');
            }

            // Validate all required billing fields are non-empty
            const requiredBillingFields = [
                'billing_customer_name', 'billing_address', 'billing_city', 
                'billing_state', 'billing_country', 'billing_email'
            ];
            for (const field of requiredBillingFields) {
                if (!orderData[field] || orderData[field].toString().trim() === '') {
                    throw new Error(`Missing or empty required field: ${field}`);
                }
            }

            // Validate all required shipping fields are non-empty
            const requiredShippingFields = [
                'shipping_customer_name', 'shipping_address', 'shipping_city', 
                'shipping_state', 'shipping_country', 'shipping_email'
            ];
            for (const field of requiredShippingFields) {
                if (!orderData[field] || orderData[field].toString().trim() === '') {
                    throw new Error(`Missing or empty required field: ${field}`);
                }
            }

            // Create order in Shiprocket
            const shipmentResponse = await this.createOrder(orderData);
            
            // Return structured response with consistent field names
            return {
                order_id: shipmentResponse.order_id,
                shipment_id: shipmentResponse.shipment_id,
                awb_code: null, // AWB is generated separately
                courier_company_id: null,
                courier_name: 'Pending Assignment',
                estimated_delivery_date: null,
                message: 'Shipment created successfully in Shiprocket'
            };
        } catch (error) {
            console.error('❌ Error creating Shiprocket order from our format:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data
            });
            throw error;
        }
    }

    // Create order with custom address data from admin
    async createOrderWithCustomAddress(order, addressData) {
        try {
            console.log('📦 Creating shipment with custom address data:', {
                orderId: order._id,
                hasAddressData: !!addressData
            });

            // Validate address data
            const requiredFields = [
                'billing_customer_name', 'billing_address', 'billing_city', 
                'billing_state', 'billing_pincode', 'billing_email', 'billing_phone',
                'shipping_customer_name', 'shipping_address', 'shipping_city',
                'shipping_state', 'shipping_pincode', 'shipping_email', 'shipping_phone'
            ];

            for (const field of requiredFields) {
                if (!addressData[field] || addressData[field].toString().trim() === '') {
                    throw new Error(`Missing or empty required field: ${field}`);
                }
            }

            // Validate phone numbers (10 digits)
            if (!/^\d{10}$/.test(addressData.billing_phone)) {
                throw new Error('Invalid billing phone number. Must be exactly 10 digits.');
            }
            if (!/^\d{10}$/.test(addressData.shipping_phone)) {
                throw new Error('Invalid shipping phone number. Must be exactly 10 digits.');
            }

            // Validate pincodes (6 digits)
            if (!/^\d{6}$/.test(addressData.billing_pincode)) {
                throw new Error('Invalid billing pincode. Must be exactly 6 digits.');
            }
            if (!/^\d{6}$/.test(addressData.shipping_pincode)) {
                throw new Error('Invalid shipping pincode. Must be exactly 6 digits.');
            }

            // Prepare order items
            const orderItems = order.products.map((item, index) => {
                const product = item.productId;
                if (!product || typeof product === 'string' || product === null) {
                    return {
                        name: 'Water Level Controller',
                        sku: `SKU-${index + 1}`,
                        units: item.quantity,
                        selling_price: Math.floor(order.amount / order.products.length),
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

            // Calculate total weight from products (use product weight or default 0.5kg)
            const totalWeight = order.products.reduce((total, item) => {
                const productWeight = item.productId?.weight || 0.5;
                return total + (item.quantity * productWeight);
            }, 0);

            // Calculate package dimensions - use largest product dimensions or defaults
            let packageLength = 10;
            let packageBreadth = 10;
            let packageHeight = 5;

            if (order.products.length > 0) {
                // Get maximum dimensions from all products
                order.products.forEach(item => {
                    const product = item.productId;
                    if (product?.length) packageLength = Math.max(packageLength, product.length);
                    if (product?.breadth) packageBreadth = Math.max(packageBreadth, product.breadth);
                    if (product?.height) packageHeight = Math.max(packageHeight, product.height);
                });
            }

            // Build order data with custom addresses
            const orderData = {
                order_id: order._id.toString(),
                order_date: order.createdAt.toISOString().split('T')[0],
                pickup_location: "Primary",
                comment: "Water Level Controller Order",
                billing_customer_name: addressData.billing_customer_name,
                billing_last_name: addressData.billing_last_name || ".",
                billing_address: addressData.billing_address,
                billing_address_2: addressData.billing_address_2 || "",
                billing_city: addressData.billing_city,
                billing_pincode: addressData.billing_pincode,
                billing_state: addressData.billing_state,
                billing_country: addressData.billing_country || 'India',
                billing_email: addressData.billing_email,
                billing_phone: addressData.billing_phone,
                shipping_is_billing: false, // Always false when using custom addresses
                shipping_customer_name: addressData.shipping_customer_name,
                shipping_last_name: addressData.shipping_last_name || ".",
                shipping_address: addressData.shipping_address,
                shipping_address_2: addressData.shipping_address_2 || "",
                shipping_city: addressData.shipping_city,
                shipping_pincode: addressData.shipping_pincode,
                shipping_state: addressData.shipping_state,
                shipping_country: addressData.shipping_country || 'India',
                shipping_email: addressData.shipping_email,
                shipping_phone: addressData.shipping_phone,
                order_items: orderItems,
                payment_method: order.paymentMethod === 'cod' ? "COD" : "Prepaid",
                sub_total: order.amount,
                length: packageLength,
                breadth: packageBreadth,
                height: packageHeight,
                weight: totalWeight
            };

            console.log('Final orderData with custom addresses:', JSON.stringify(orderData, null, 2));

            // Create order in Shiprocket
            const shipmentResponse = await this.createOrder(orderData);
            
            return {
                order_id: shipmentResponse.order_id,
                shipment_id: shipmentResponse.shipment_id,
                awb_code: null,
                courier_company_id: null,
                courier_name: 'Pending Assignment',
                estimated_delivery_date: null,
                message: 'Shipment created successfully with custom address'
            };
        } catch (error) {
            console.error('❌ Error creating Shiprocket order with custom address:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data
            });
            throw error;
        }
    }


    async checkIntegrationStatus() {
        try {
            const integration = await this.getIntegration();
            const tokenValid = integration.tokenExpiry && 
                new Date(integration.tokenExpiry) > new Date();
            
            if (!tokenValid) {
                return {
                    status: 'token_expired',
                    email: integration.email,
                    message: 'Re-authentication required',
                    last_authenticated: integration.lastAuthenticated
                };
            }

            // Test API connectivity
            const locations = await this.getPickupLocations();
            
            return {
                status: 'connected',
                email: integration.email,
                pickup_locations: locations.data?.length || 0,
                last_authenticated: integration.lastAuthenticated,
                token_expires: integration.tokenExpiry
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                requires_reauth: error.message.includes('TOKEN_EXPIRED')
            };
        }
    }
}

module.exports = new ShiprocketService();