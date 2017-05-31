const router = require('express').Router();
const fs = require('fs');
const path = require('path');

const listPath = path.resolve(__dirname, '../db.json');


router.get('/', (req, res, next) => {
  fs.readFile(listPath, 'utf8', (err, data) => {
    if (err) return next(err);
    data = JSON.parse(data);
    const word = data[Math.floor(Math.random() * data.length)];
    res.json(word);
  });
});

module.exports = router;
