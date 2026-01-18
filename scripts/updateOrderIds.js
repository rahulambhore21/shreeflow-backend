/**
 * Script to update existing orders with formatted order IDs
 * Run this once after deploying the order ID changes
 * 
 * Usage: node scripts/updateOrderIds.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function updateOrderIds() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB\n');

        // Get all orders without an orderId, sorted by creation date
        const orders = await Order.find({ orderId: { $exists: false } })
            .sort({ createdAt: 1 });

        console.log(`📦 Found ${orders.length} orders to update\n`);

        if (orders.length === 0) {
            console.log('✅ All orders already have order IDs!');
            await mongoose.connection.close();
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const order of orders) {
            try {
                const date = new Date(order.createdAt);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                
                // Find the last order ID for this year-month
                const lastOrder = await Order.findOne({
                    orderId: new RegExp(`^SF-${year}${month}-`)
                }).sort({ orderId: -1 });
                
                let sequence = 1;
                if (lastOrder && lastOrder.orderId) {
                    const lastSequence = parseInt(lastOrder.orderId.split('-')[2]);
                    sequence = lastSequence + 1;
                }
                
                // Generate order ID: SF-YYYYMM-XXXX
                const newOrderId = `SF-${year}${month}-${String(sequence).padStart(4, '0')}`;
                
                // Update the order
                order.orderId = newOrderId;
                await order.save();
                
                updated++;
                console.log(`✅ Updated: ${order._id} → ${newOrderId}`);
                
            } catch (error) {
                failed++;
                console.error(`❌ Failed to update ${order._id}:`, error.message);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Successfully updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📦 Total: ${orders.length}`);

        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the script
updateOrderIds();
