const { pool } = require('../db/pool');
const { batchIntakeSchema } = require('../validators/schemas');
const logger = require('../utils/logger');

/**
 * POST /api/inventory/batch
 * Accept inventory intake — upsert product, create batch record.
 */
async function createBatch(req, res) {
  const client = await pool.connect();
  try {
    const { error, value } = batchIntakeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(400).json({ success: false, errors: details });
    }

    const { sku, name, category, batch_number, quantity_received, cost_price, expiry_date } = value;

    await client.query('BEGIN');

    // Upsert product by SKU
    const productResult = await client.query(
      `INSERT INTO products (sku, name, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
       RETURNING id, sku, name, category`,
      [sku, name, category]
    );
    const product = productResult.rows[0];

    // Insert inventory batch
    const batchResult = await client.query(
      `INSERT INTO inventory_batches (product_id, batch_number, quantity_received, quantity_remaining, cost_price, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product.id, batch_number, quantity_received, quantity_received, cost_price, expiry_date]
    );
    const batch = batchResult.rows[0];

    await client.query('COMMIT');

    logger.info('Batch created successfully', { sku, batch_number, quantity: quantity_received });

    return res.status(201).json({
      success: true,
      data: {
        product,
        batch,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to create inventory batch', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error while creating batch' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/inventory/batches
 * Retrieve all active inventory batches with product info.
 */
async function getAllBatches(req, res) {
  try {
    const result = await pool.query(
      `SELECT ib.*, p.sku, p.name AS product_name, p.category
       FROM inventory_batches ib
       JOIN products p ON p.id = ib.product_id
       WHERE ib.quantity_remaining > 0
       ORDER BY ib.expiry_date ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    logger.error('Failed to retrieve batches', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error while fetching batches' });
  }
}

module.exports = { createBatch, getAllBatches };
