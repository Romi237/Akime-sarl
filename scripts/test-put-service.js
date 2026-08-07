
const http = require('http');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testPutService() {
  try {
    // First, let's get a token. We'll use the default admin credentials.
    // Let's log in as admin first to get a token!
    const loginData = JSON.stringify({
      email: 'admin@akime.com',
      password: 'BATmusic90'
    });

    // Log in
    const loginOptions = {
      hostname: 'localhost',
      port: 4001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginReq = http.request(loginOptions, (loginRes) => {
      let loginBody = '';
      loginRes.on('data', chunk => loginBody += chunk);
      loginRes.on('end', async () => {
        const loginJson = JSON.parse(loginBody);
        console.log('Login response:', loginJson);
        const token = loginJson.data?.accessToken;
        if (!token) {
          console.error('No token received!');
          return;
        }
        console.log('Got token:', token);

        // Now make a PUT request to update the service
        const serviceId = '6a55167dfebb66cbc856d4c9';
        const form = new FormData();
        form.append('name', 'Génie Civil');
        form.append('title', 'Génie Civil');
        form.append('category', 'Génie-Civil');
        form.append('description', 'Construction de routes, ponts, ouvrages hydrauliques et infrastructures urbaines. Notre expertise en génie civil garantit des ouvrages durables et conformes aux normes.');
        form.append('icon', 'fas fa-hard-hat');
        form.append('subPages', JSON.stringify([
          { title: 'Routes & Ponts', description: 'Construction et réparation de routes et ponts.' },
          { title: 'Ouvrages Hydrauliques', description: 'Barrages, canaux, etc.' }
        ]));

        const putOptions = {
          hostname: 'localhost',
          port: 4001,
          path: `/api/content/services/${serviceId}`,
          method: 'PUT',
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
          }
        };

        const putReq = http.request(putOptions, (putRes) => {
          let putBody = '';
          putRes.on('data', chunk => putBody += chunk);
          putRes.on('end', () => {
            console.log('PUT response:', JSON.parse(putBody));
          });
        });
        form.pipe(putReq);
      });
    });
    loginReq.write(loginData);
    loginReq.end();
  } catch (err) {
    console.error('Test error:', err);
  }
}

testPutService();
