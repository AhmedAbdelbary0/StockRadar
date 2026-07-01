const express = require('express');
const router = express.Router();
const { createBatch, getAllBatches } = require('../controllers/inventoryController');

router.post('/batch', createBatch);
router.get('/batches', getAllBatches);

module.exports = router;
