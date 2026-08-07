
require('dotenv').config();
const dbConnection = require('../api/utils/database');
const Service     = require('../api/models/Service');

async function test() {
  await dbConnection.connect();

  console.log('Creating test service with sub-pages...');
  
  const testService = await Service.create({
    name: 'Gros Œuvre',
    title: 'Gros Œuvre',
    category: 'gros-oeuvre',
    description: 'Travaux de fondation, maçonnerie, etc.',
    subPages: [
      { title: 'Fondations', description: 'Travaux de fondation profonde et superficielle' },
      { title: 'Maçonnerie', description: 'Travaux de maçonnerie générale' }
    ],
    order: 1
  });

  console.log('Test service created:', JSON.stringify(testService, null, 2));

  console.log('\nRetrieving test service from DB...');
  const retrieved = await Service.findById(testService._id);
  console.log('Retrieved service:', JSON.stringify(retrieved, null, 2));

  await dbConnection.disconnect();
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
