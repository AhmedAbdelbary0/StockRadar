'use strict';

const express = require('express');
const router = express.Router();
const { createBatch, getAllBatches } = require('../controllers/inventoryController');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Both FLOOR_STAFF and MANAGER can log and view inventory
router.post('/batch', verifyToken, requireRole(['FLOOR_STAFF', 'MANAGER']), createBatch);
router.get('/batches', verifyToken, requireRole(['FLOOR_STAFF', 'MANAGER']), getAllBatches);

module.exports = router;
