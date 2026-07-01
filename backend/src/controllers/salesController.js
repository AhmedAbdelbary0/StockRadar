const { pool } = require('../db/pool');
const { salesLogSchema } = require('../validators/schemas');
const logger = require('../utils/logger');

/**
 * POST /api/sales
 * Log a sale event — decrement batch inventory (FIFO by expiry), insert sales record.
 */
async function logSale(req, res) {
  const client = await pool.connect();
  try {
    const { error, value } = salesLogSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => d.message);
      return res.status(400).json({ success: false, errors: details });
    }

    const { sku, quantity_sold, sale_price } = value;

    await client.query('BEGIN');

    // Look up product by SKU
    const productResult = await client.query(
      'SELECT id FROM products WHERE sku = $1',
      [sku]
    );
    if (productResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `Product with SKU "${sku}" not found` });
    }
    const productId = productResult.rows[0].id;

    // Find active batches ordered by expiry (FIFO — sell nearest-expiry first)
    const batchesResult = await client.query(
      `SELECT id, quantity_remaining FROM inventory_batches
       WHERE product_id = $1 AND quantity_remaining > 0
       ORDER BY expiry_date ASC`,
      [productId]
    );

    const batches = batchesResult.rows;
    const totalAvailable = batches.reduce((sum, b) => sum + b.quantity_remaining, 0);

    if (totalAvailable < quantity_sold) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity_sold}`,
      });
    }

    // Decrement across batches (FIFO)
    let remaining = quantity_sold;
    const updatedBatches = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const deduction = Math.min(batch.quantity_remaining, remaining);
      const newQty = batch.quantity_remaining - deduction;

      await client.query(
        'UPDATE inventory_batches SET quantity_remaining = $1 WHERE id = $2',
        [newQty, batch.id]
      );

      updatedBatches.push({ batch_id: batch.id, deducted: deduction, new_remaining: newQty });
      remaining -= deduction;
    }

    // Insert sales log
    const saleResult = await client.query(
      `INSERT INTO sales_log (product_id, quantity_sold, sale_price)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, quantity_sold, sale_price]
    );

    await client.query('COMMIT');

    logger.info('Sale logged successfully', { sku, quantity_sold, batches_affected: updatedBatches.length });

    return res.status(201).json({
      success: true,
      data: {
        sale: saleResult.rows[0],
        inventory_updates: updatedBatches,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to log sale', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error while logging sale' });
  } finally {
    client.release();
  }
}

module.exports = { logSale };
