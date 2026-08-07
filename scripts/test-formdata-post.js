
const http = require('http');
const querystring = require('querystring');

// Step 1: Log in to get token
const loginData = JSON.stringify({
  email: 'admin@akime.com',
  password: 'BATmusic90'
});

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
  loginRes.on('data', (chunk) => {
    loginBody += chunk;
  });
  loginRes.on('end', async () => {
    console.log('Login response body:', loginBody);
    const loginJson = JSON.parse(loginBody);
    if (!loginJson.success) {
      console.error('Login failed:', loginJson);
      return;
    }
    console.log('Login successful, token:', loginJson.data.accessToken);
    const token = loginJson.data.accessToken;

    // Step 2: Send a POST request with FormData
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'Test Service 2',
      `--${boundary}`,
      'Content-Disposition: form-data; name="title"',
      '',
      'Test Service 2',
      `--${boundary}`,
      'Content-Disposition: form-data; name="category"',
      '',
      'test-category-2',
      `--${boundary}`,
      'Content-Disposition: form-data; name="description"',
      '',
      'Test description',
      `--${boundary}`,
      'Content-Disposition: form-data; name="icon"',
      '',
      'fa-cogs',
      `--${boundary}`,
      'Content-Disposition: form-data; name="subPages"',
      '',
      JSON.stringify([
        { title: 'Test Subpage 1', description: 'Test subpage description' },
        { title: 'Test Subpage 2', description: 'Another test subpage' }
      ]),
      `--${boundary}--`
    ].join('\r\n');

    const postOptions = {
      hostname: 'localhost',
      port: 4001,
      path: '/api/content/services',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData),
        'Authorization': `Bearer ${token}`
      }
    };

    const postReq = http.request(postOptions, (postRes) => {
      let postBody = '';
      postRes.on('data', (chunk) => {
        postBody += chunk;
      });
      postRes.on('end', () => {
        console.log('POST response:', postBody);
      });
    });
    postReq.write(formData);
    postReq.end();
  });
});

loginReq.write(loginData);
loginReq.end();
