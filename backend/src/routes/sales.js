'use strict';

const express = require('express');
const router = express.Router();
const { logSale } = require('../controllers/salesController');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Both FLOOR_STAFF and MANAGER can log sales
router.post('/', verifyToken, requireRole(['FLOOR_STAFF', 'MANAGER']), logSale);

module.exports = router;
