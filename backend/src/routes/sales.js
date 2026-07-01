const express = require('express');
const router = express.Router();
const { logSale } = require('../controllers/salesController');

router.post('/', logSale);

module.exports = router;
