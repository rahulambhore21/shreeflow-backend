const mongoose = require('mongoose');
const { ShippingRate, ShippingZone } = require('../models/Shipping');
require('dotenv').config();

// Sample shipping rates
const sampleShippingRates = [
  {
    name: "Standard Shipping",
    description: "Regular delivery within business days",
    baseRate: 50,
    perKmRate: 2,
    freeShippingThreshold: 1500,
    estimatedDays: "3-5",
    active: true
  },
  {
    name: "Express Shipping",
    description: "Fast delivery for urgent orders",
    baseRate: 100,
    perKmRate: 5,
    freeShippingThreshold: 2500,
    estimatedDays: "1-2",
    active: true
  },
  {
    name: "Economic Shipping",
    description: "Budget-friendly shipping option",
    baseRate: 30,
    perKmRate: 1.5,
    freeShippingThreshold: 1000,
    estimatedDays: "5-7",
    active: true
  }
];

// Sample shipping zones
const sampleShippingZones = [
  {
    name: "North India Zone",
    states: [
      "Delhi", "Punjab", "Haryana", "Himachal Pradesh", 
      "Uttarakhand", "Uttar Pradesh", "Chandigarh"
    ],
    rate: 60,
    estimatedDays: "2-4",
    active: true
  },
  {
    name: "West India Zone",
    states: [
      "Maharashtra", "Gujarat", "Rajasthan", "Goa",
      "Dadra and Nagar Haveli and Daman and Diu"
    ],
    rate: 80,
    estimatedDays: "3-5",
    active: true
  },
  {
    name: "South India Zone",
    states: [
      "Karnataka", "Tamil Nadu", "Kerala", "Andhra Pradesh",
      "Telangana", "Puducherry"
    ],
    rate: 100,
    estimatedDays: "4-6",
    active: true
  },
  {
    name: "East India Zone",
    states: [
      "West Bengal", "Odisha", "Jharkhand", "Bihar",
      "Assam", "Meghalaya", "Manipur", "Mizoram",
      "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"
    ],
    rate: 90,
    estimatedDays: "4-6",
    active: true
  },
  {
    name: "Central India Zone",
    states: [
      "Madhya Pradesh", "Chhattisgarh"
    ],
    rate: 70,
    estimatedDays: "3-5",
    active: true
  },
  {
    name: "Special Areas",
    states: [
      "Jammu and Kashmir", "Ladakh", "Andaman and Nicobar Islands", "Lakshadweep"
    ],
    rate: 150,
    estimatedDays: "7-10",
    active: true
  }
];

async function seedShippingData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await ShippingRate.deleteMany({});
    await ShippingZone.deleteMany({});
    console.log('Cleared existing shipping data');

    // Insert sample shipping rates
    const insertedRates = await ShippingRate.insertMany(sampleShippingRates);
    console.log(`Inserted ${insertedRates.length} shipping rates`);

    // Insert sample shipping zones
    const insertedZones = await ShippingZone.insertMany(sampleShippingZones);
    console.log(`Inserted ${insertedZones.length} shipping zones`);

    console.log('\nShipping seed data created successfully!');
    console.log('\nShipping Rates:');
    insertedRates.forEach(rate => {
      console.log(`- ${rate.name}: ₹${rate.baseRate} base + ₹${rate.perKmRate}/km (Free above ₹${rate.freeShippingThreshold})`);
    });

    console.log('\nShipping Zones:');
    insertedZones.forEach(zone => {
      console.log(`- ${zone.name}: ₹${zone.rate} (${zone.states.length} states/UTs)`);
    });

  } catch (error) {
    console.error('Error seeding shipping data:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedShippingData();
}

module.exports = seedShippingData;