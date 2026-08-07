
require('dotenv').config();
const dbConnection = require('../api/utils/database');
const Service = require('../api/models/Service');
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

// First, let's directly test Service.create and then Service.findByIdAndUpdate
async function testDirectModel() {
  await dbConnection.connect();
  console.log('=== Testing Direct Model Update ===');
  // Let's find the first service
  const service = await Service.findOne().sort({ _id: -1 });
  console.log('Found service:', service);
  
  if (service) {
    const newData = {
      name: service.name,
      title: service.title,
      category: service.category,
      description: service.description,
      icon: service.icon,
      subPages: [
        { title: "SUBPAGE TEST 1", description: "Desc 1" },
        { title: "SUBPAGE TEST 2", description: "Desc 2" }
      ]
    };
    console.log('Updating with:', newData);
    
    const updated = await Service.findByIdAndUpdate(service._id, newData, { new: true });
    console.log('Updated directly:', JSON.stringify(updated, null, 2));
  }
  
  await dbConnection.disconnect();
}

testDirectModel().catch(err => {
  console.error(err);
  process.exit(1);
});
