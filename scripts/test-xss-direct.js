
const xss = require('xss-clean');

// Simulate req.body
const req = {
  body: {
    name: 'Test Service',
    subPages: JSON.stringify([
      { title: 'Subpage 1', description: 'Subpage 1 desc' },
      { title: 'Subpage 2', description: 'Subpage 2 desc' }
    ])
  }
};

// Apply xss-clean as middleware would
const res = {};
const next = () => console.log('next called');
const xssMiddleware = xss();
xssMiddleware(req, res, next);

console.log('After xss-clean:');
console.log('req.body:', req.body);
console.log('req.body.subPages:', req.body.subPages);
console.log('typeof req.body.subPages:', typeof req.body.subPages);
