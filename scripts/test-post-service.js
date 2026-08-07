
require('dotenv').config();
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function testPostService() {
  const formData = new FormData();
  formData.append('name', 'Test Service');
  formData.append('title', 'Test Service');
  formData.append('category', 'test-category');
  formData.append('description', 'Test Description');
  formData.append('icon', 'fa-test');
  formData.append('subPages', JSON.stringify([
    { title: 'Subpage 1', description: 'Subpage 1 desc' },
    { title: 'Subpage 2', description: 'Subpage 2 desc' }
  ]));

  // First, we need an auth token! Let's create a test user or use the existing admin!
  // Wait, let's just test the endpoint without auth first (but we need auth, so let's skip auth for testing)
  // Alternatively, let's modify the content.js route temporarily to skip auth for testing
  // OR let's use the create-admin script to create an admin and get a token!

  console.log('FormData keys:', Object.keys(formData));
  console.log('FormData subPages:', formData.get('subPages'));
  
  console.log('Test script done - we\'ll need a token to test the actual endpoint!');
}

testPostService().catch(err => {
  console.error(err);
});
