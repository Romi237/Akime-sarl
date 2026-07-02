#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../api/models/User');
const dbConnection = require('../api/utils/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    process.stdin.on('data', function(char) {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function createAdminUser() {
  try {
    console.log('🚀 A-KIME Admin User Creation Tool\n');

    // Connect to MongoDB
    await dbConnection.connect();

    // Check if any admin users exist
    const existingAdmins = await User.find({ role: 'admin' });
    
    if (existingAdmins.length > 0) {
      console.log('⚠️  Admin users already exist:');
      existingAdmins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
      
      const proceed = await question('\nDo you want to create another admin user? (y/N): ');
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        console.log('👋 Exiting...');
        process.exit(0);
      }
      console.log();
    }

    // Collect user information
    const name = await question('👤 Enter admin name: ');
    if (!name || name.trim().length < 2) {
      console.log('❌ Name must be at least 2 characters long');
      process.exit(1);
    }

    const email = await question('📧 Enter admin email: ');
    if (!email || !email.includes('@')) {
      console.log('❌ Please enter a valid email address');
      process.exit(1);
    }
    
    // Check if email is in allowed admin list
    const allowedAdminEmails = (process.env.ALLOWED_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e);
    
    if (!allowedAdminEmails.includes(email.toLowerCase())) {
      console.log('❌ This email is not authorized to be an admin');
      console.log('   Allowed emails:', allowedAdminEmails.join(', '));
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ A user with this email already exists');
      process.exit(1);
    }

    const password = await questionHidden('🔒 Enter admin password (min 8 characters): ');
    if (!password || password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    const confirmPassword = await questionHidden('🔒 Confirm password: ');
    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match');
      process.exit(1);
    }

    console.log('\n🔄 Creating admin user...');

    // Create admin user
    const adminUser = await User.createAdmin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser._id}\n`);
    
    console.log('🌐 You can now login at: http://localhost:4000/admin');
    console.log('🔐 Use the email and password you just created\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('   This email is already registered');
    }
    
    process.exit(1);
  } finally {
    rl.close();
    await dbConnection.disconnect();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Exiting...');
  rl.close();
  await dbConnection.disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;
