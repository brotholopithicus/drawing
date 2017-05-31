const router = require('express').Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'drawing' });
});

router.get('/chat', (req, res, next) => {
  res.render('chat', { title: 'chat' });
});

module.exports = router;
