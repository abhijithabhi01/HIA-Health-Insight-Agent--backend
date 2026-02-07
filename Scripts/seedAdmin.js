require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Seed Admin User Script
 * This script creates an admin user in the database
 * Run: node scripts/seedAdmin.js
 */
const seedAdmin = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}\n`);
      
      const overwrite = await question('Do you want to create another admin? (yes/no): ');
      
      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('\n❌ Admin creation cancelled');
        rl.close();
        process.exit(0);
      }
    }
    
    console.log('\n📝 Enter admin details:\n');
    
    const name = await question('Full Name: ');
    const email = await question('Email: ');
    const password = await question('Password (min 6 characters): ');
    const age = await question('Age (optional, press enter to skip): ');
    const gender = await question('Gender (optional, press enter to skip): ');
    
    // Validate inputs
    if (!name || !email || !password) {
      console.log('\n❌ Name, email, and password are required');
      rl.close();
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.log('\n❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('\n❌ User with this email already exists');
      rl.close();
      process.exit(1);
    }
    
    // Create admin user
    const admin = new User({
      name,
      email,
      password,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      role: 'ADMIN',
      isActive: true
    });
    
    await admin.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('\n👤 Admin Details:');
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin._id}\n`);
    
    rl.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    rl.close();
    process.exit(1);
  }
};

// Run the script
seedAdmin();
