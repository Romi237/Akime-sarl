#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const dbConnection = require('../api/utils/database');

async function testMongoDBConnection() {
  console.log('🔍 MongoDB Connection Troubleshooter\n');

  // Test 1: Environment Variables
  console.log('1️⃣ Checking environment variables...');
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.log('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Make sure you have a .env file with MONGODB_URI set');
    return;
  }
  
  console.log('✅ MONGODB_URI found');
  
  // Parse connection string (safely)
  try {
    const url = new URL(mongoUri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    console.log(`📍 Host: ${url.hostname}`);
    console.log(`👤 Username: ${url.username || 'Not specified'}`);
    console.log(`🔒 Password: ${url.password ? '***' : 'Not specified'}`);
    console.log(`🗄️ Database: ${url.pathname.split('/')[1] || 'Not specified'}\n`);
  } catch (error) {
    console.log('⚠️ Could not parse connection string format\n');
  }

  // Test 2: Basic Connection
  console.log('2️⃣ Testing MongoDB connection...');
  try {
    await dbConnection.connect();
    console.log('✅ Successfully connected to MongoDB\n');
  } catch (error) {
    console.log('❌ Failed to connect to MongoDB');
    console.log(`Error: ${error.message}\n`);
    
    // Provide specific troubleshooting based on error type
    if (error.message.includes('bad auth')) {
      console.log('🔐 Authentication Error Troubleshooting:');
      console.log('   1. Check your username and password in the connection string');
      console.log('   2. Verify the database user exists in MongoDB Atlas');
      console.log('   3. Ensure the user has the correct permissions');
      console.log('   4. Check if the password contains special characters that need URL encoding');
      console.log('   5. Try creating a new database user with a simple password\n');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('🌐 Network Error Troubleshooting:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify the cluster hostname is correct');
      console.log('   3. Ensure your IP address is whitelisted in MongoDB Atlas');
      console.log('   4. Try adding 0.0.0.0/0 to whitelist temporarily for testing\n');
    }
    
    if (error.message.includes('MongoServerSelectionError')) {
      console.log('🔧 Server Selection Error Troubleshooting:');
      console.log('   1. Check if the MongoDB cluster is running');
      console.log('   2. Verify the connection string format');
      console.log('   3. Ensure you\'re using the correct connection method (mongodb+srv)');
      console.log('   4. Try connecting from MongoDB Compass with the same string\n');
    }
    
    return;
  }

  // Test 3: Database Operations
  console.log('3️⃣ Testing database operations...');
  try {
    // Test ping
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database ping successful');
    
    // Test collection access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('📋 Existing collections:');
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.log('❌ Database operation failed:', error.message);
  }

  // Test 4: Connection Info
  console.log('\n4️⃣ Connection Information:');
  const status = dbConnection.getConnectionStatus();
  console.log(`📊 Connection Status: ${status.isConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`🔗 Ready State: ${getReadyStateText(status.readyState)}`);
  console.log(`🌐 Host: ${status.host || 'Unknown'}`);
  console.log(`🗄️ Database: ${status.name || 'Unknown'}`);

  await dbConnection.disconnect();
}

function getReadyStateText(state) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[state] || 'Unknown';
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Exiting...');
  await dbConnection.disconnect();
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testMongoDBConnection().catch(console.error);
}

module.exports = testMongoDBConnection;
