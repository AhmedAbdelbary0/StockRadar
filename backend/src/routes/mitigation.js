'use strict';

const express = require('express');
const router = express.Router();
const { generateMitigation } = require('../controllers/mitigationController');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// POST /api/mitigation/generate — MANAGER only
router.post('/generate', verifyToken, requireRole(['MANAGER']), generateMitigation);

module.exports = router;
