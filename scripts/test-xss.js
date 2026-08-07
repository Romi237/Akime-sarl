
const xss = require('xss-clean');
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xss());

app.post('/test', (req, res) => {
  console.log('req.body:', req.body);
  console.log('typeof req.body.subPages:', typeof req.body.subPages);
  res.json(req.body);
});

app.listen(4002, () => console.log('Test server on 4002'));
