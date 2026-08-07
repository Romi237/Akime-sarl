
require('dotenv').config();
const dbConnection = require('../api/utils/database');
const Service = require('../api/models/Service');

async function testUpdateService() {
  await dbConnection.connect();

  const serviceId = '6a55167dfebb66cbc856d4c9';
  const data = {
    name: 'Génie Civil',
    title: 'Génie Civil',
    category: 'Génie-Civil',
    description: 'Construction de routes, ponts, ouvrages hydrauliques et infrastructures urbaines. Notre expertise en génie civil garantit des ouvrages durables et conformes aux normes.',
    icon: 'fas fa-hard-hat',
    subPages: [
      { title: 'Routes & Ponts', description: 'Construction et réparation de routes et ponts.' },
      { title: 'Ouvrages Hydrauliques', description: 'Barrages, canaux, etc.' }
    ]
  };

  console.log('Updating service with data:', data);
  const updatedService = await Service.findByIdAndUpdate(serviceId, data, { new: true });
  console.log('Updated service:', JSON.stringify(updatedService, null, 2));

  await dbConnection.disconnect();
}

testUpdateService().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
