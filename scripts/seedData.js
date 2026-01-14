const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Product = require('../models/Product');
const User = require('../models/User');

// Sample data
const sampleProducts = [
  {
    title: "Shree Flow Basic Water Level Controller",
    description: "Automatic water level controller for overhead and underground tanks. Features smart water detection, auto ON/OFF motor control, and built-in voltage protection. Perfect for homes and small businesses.",
    image: "/photo1.png",
    categories: ["Water Controllers", "Basic"],
    size: "Standard",
    color: "Blue",
    price: 2999,
    stock: 50,
    sku: "SF-BASIC-001"
  },
  {
    title: "Shree Flow Premium Water Level Controller",
    description: "Advanced water level controller with LED indicators, dry run protection, and enhanced safety features. Includes remote monitoring capability and mobile alerts. Ideal for commercial applications.",
    image: "/photo1.png",
    categories: ["Water Controllers", "Premium"],
    size: "Large",
    color: "Silver",
    price: 4999,
    stock: 30,
    sku: "SF-PREMIUM-001"
  },
  {
    title: "Shree Flow Smart WiFi Controller",
    description: "IoT-enabled water level controller with smartphone app control, real-time monitoring, and automated scheduling. Features cloud connectivity and data analytics. Perfect for tech-savvy users.",
    image: "/photo1.png",
    categories: ["Water Controllers", "Smart", "WiFi"],
    size: "Compact",
    color: "Black",
    price: 7999,
    stock: 20,
    sku: "SF-SMART-001"
  },
  {
    title: "Shree Flow Industrial Controller",
    description: "Heavy-duty water level controller designed for industrial applications. Supports multiple tanks, high-capacity motors, and extreme weather conditions. Includes 3-year warranty.",
    image: "/photo1.png",
    categories: ["Water Controllers", "Industrial"],
    size: "XL",
    color: "Gray",
    price: 12999,
    stock: 15,
    sku: "SF-INDUSTRIAL-001"
  }
];

const sampleAdmin = {
  username: "admin",
  email: "admin@shreeflow.com",
  password: bcrypt.hashSync("admin123", 10),
  isAdmin: true
};

const sampleUser = {
  username: "testuser",
  email: "user@example.com",
  password: bcrypt.hashSync("user123", 10),
  isAdmin: false
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = new User(sampleAdmin);
    await adminUser.save();
    console.log('Created admin user');

    // Create test user
    const testUser = new User(sampleUser);
    await testUser.save();
    console.log('Created test user');

    // Create products
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      console.log(`Created product: ${product.title}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin / admin123');
    console.log('User: testuser / user123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();