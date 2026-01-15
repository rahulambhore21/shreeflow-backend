const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@shreeflow.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log(`Email: admin@shreeflow.com`);
      console.log(`Username: ${existingAdmin.username}`);
      return;
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@shreeflow.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      isAdmin: true
    });

    await adminUser.save();
    
    console.log('Admin user created successfully!');
    console.log('Login credentials:');
    console.log('Email: admin@shreeflow.com');
    console.log('Password: admin123');
    console.log('Username: admin');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;