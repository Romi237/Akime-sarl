
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');

async function testPutService() {
  const serviceId = '6a5518fafebb66cbc856dee1'; // Gros Œuvre service
  const form = new FormData();
  
  form.append('name', 'Gros Œuvre');
  form.append('title', 'Gros Œuvre');
  form.append('category', 'gros-oeuvre');
  form.append('description', 'Fondations, structures en béton armé, maçonnerie.');
  form.append('icon', 'fas fa-building');
  form.append('subPages', JSON.stringify([
    { title: 'Fondations Profondes', description: 'Pieux, caissons, etc.' },
    { title: 'Maçonnerie', description: 'Briques, blocs, etc.' }
  ]));

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/content/services/${serviceId}`,
    method: 'PUT',
    headers: form.getHeaders()
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response data:', data);
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    form.pipe(req);
  });
}

testPutService().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
