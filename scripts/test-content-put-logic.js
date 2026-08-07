
require('dotenv').config();
const dbConnection = require('../api/utils/database');
const Service = require('../api/models/Service');

async function testContentPutRouteLogic() {
  await dbConnection.connect();
  const serviceId = '6a5518fafebb66cbc856dee1'; // same service as before
  
  // Simulate req.body as if it came from FormData
  // (subPages is a JSON string, just like in admin form)
  const reqBodySimulated = {
    name: 'Gros Œuvre',
    title: 'Gros Œuvre',
    category: 'gros-oeuvre',
    description: 'Fondations, structures en béton armé, maçonnerie.',
    icon: 'fas fa-building',
    subPages: JSON.stringify([
      { title: "Test Subpage 1", description: "Desc 1" },
      { title: "Test Subpage 2", description: "Desc 2" }
    ])
  };
  
  console.log('=== Simulating req.body from FormData ===');
  console.log('req.body:', reqBodySimulated);
  
  // Now apply content.js's PUT route parsing logic
  const data = { ...reqBodySimulated };
  if (data.subPages && typeof data.subPages === 'string') {
    try { data.subPages = JSON.parse(data.subPages); } catch { data.subPages = []; }
  }
  
  console.log('=== data after parsing subPages ===');
  console.log('data.subPages:', data.subPages);
  
  // Now do Service.findByIdAndUpdate just like in the route!
  const updatedService = await Service.findByIdAndUpdate(serviceId, data, { new: true });
  
  console.log('=== updatedService from DB ===');
  console.log(JSON.stringify(updatedService, null, 2));
  
  await dbConnection.disconnect();
}

testContentPutRouteLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
