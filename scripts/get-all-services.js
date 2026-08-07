
require('dotenv').config();
const dbConnection = require('./api/utils/database');
const Service = require('./api/models/Service');

async function getServices() {
  try {
    await dbConnection.connect();
    const services = await Service.find().sort({ order: 1, createdAt: -1 });
    console.log('Services:', JSON.stringify(services, null, 2));
  } finally {
    await dbConnection.disconnect();
  }
}

getServices();
