#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

async function simpleMongoTest() {
  console.log('🔍 Simple MongoDB Connection Test\n');

  const mongoUri = process.env.MONGODB_URI;
  console.log('📡 Connecting to MongoDB...');
  console.log(`🌐 URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  try {
    // Use minimal connection options
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    console.log('✅ Successfully connected to MongoDB!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔗 Ready State:', mongoose.connection.readyState);

    // Test a simple operation
    console.log('\n🧪 Testing database operations...');
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);

    if (collections.length > 0) {
      console.log('📋 Collections:');
      collections.forEach(col => console.log(`   - ${col.name}`));
    }

    console.log('\n🎉 MongoDB connection test passed!');
    console.log('✨ You can now run: npm run create-admin');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('bad auth')) {
      console.log('\n🔐 Authentication Error Solutions:');
      console.log('1. Check username/password in MongoDB Atlas');
      console.log('2. Verify database user permissions');
      console.log('3. Try creating a new database user');
    }
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Error Solutions:');
      console.log('1. Check internet connection');
      console.log('2. Verify cluster hostname');
      console.log('3. Check IP whitelist in MongoDB Atlas');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n👋 Exiting...');
  await mongoose.disconnect();
  process.exit(0);
});

simpleMongoTest();
