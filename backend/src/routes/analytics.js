const express = require('express');
const router = express.Router();
const { getExpiryRisk } = require('../controllers/analyticsController');

router.get('/expiry-risk', getExpiryRisk);

module.exports = router;
