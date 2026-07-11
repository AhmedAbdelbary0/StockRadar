'use strict';

const express = require('express');
const router = express.Router();
const { getExpiryRisk } = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Analytics is strictly MANAGER only — FLOOR_STAFF cannot access this
router.get('/expiry-risk', verifyToken, requireRole(['MANAGER']), getExpiryRisk);

module.exports = router;
