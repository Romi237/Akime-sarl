
const http = require('http');

function testFetchServices() {
  http.get('http://localhost:4001/test-services', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const json = JSON.parse(data);
      console.log('Fetched services:', JSON.stringify(json, null, 2));
    });
  }).on('error', err => console.error('Error:', err));
}

testFetchServices();
