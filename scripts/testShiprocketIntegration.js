const shiprocketService = require('../services/ShiprocketService');
const { ShiprocketIntegration } = require('../models/Shipping');

async function testShiprocketIntegration() {
    try {
        console.log('🚀 Testing Shiprocket Integration...\n');

        // Test 1: Check if integration exists in database
        console.log('1. Checking database integration...');
        const integration = await ShiprocketIntegration.findOne({ isActive: true });
        if (integration) {
            console.log('✅ Integration found in database');
            console.log(`   Email: ${integration.email}`);
            console.log(`   Active: ${integration.isActive}`);
        } else {
            console.log('❌ No integration found in database');
            return;
        }

        // Test 2: Test authentication
        console.log('\n2. Testing authentication...');
        try {
            const token = await shiprocketService.authenticate();
            console.log('✅ Authentication successful');
            console.log(`   Token: ${token.substring(0, 20)}...`);
        } catch (error) {
            console.log('❌ Authentication failed');
            console.log(`   Error: ${error.message}`);
            return;
        }

        // Test 3: Test connection status check
        console.log('\n3. Testing connection status...');
        try {
            const status = await shiprocketService.checkIntegrationStatus();
            console.log('✅ Connection status check successful');
            console.log(`   Connected: ${status.connected}`);
            if (status.connected) {
                console.log(`   Email: ${status.email}`);
            } else {
                console.log(`   Error: ${status.error}`);
            }
        } catch (error) {
            console.log('❌ Connection status check failed');
            console.log(`   Error: ${error.message}`);
        }

        // Test 4: Test serviceability check
        console.log('\n4. Testing serviceability check...');
        try {
            const serviceability = await shiprocketService.getShippingRates({
                pickup_postcode: '110001',
                delivery_postcode: '400001',
                weight: 1,
                length: 10,
                breadth: 10,
                height: 5
            });
            console.log('✅ Serviceability check successful');
            console.log(`   Response: ${JSON.stringify(serviceability, null, 2)}`);
        } catch (error) {
            console.log('❌ Serviceability check failed');
            console.log(`   Error: ${error.message}`);
        }

        console.log('\n🎉 Shiprocket integration test completed!');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    testShiprocketIntegration();
}

module.exports = testShiprocketIntegration;