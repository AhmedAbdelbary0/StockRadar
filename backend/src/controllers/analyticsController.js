const { pool } = require('../db/pool');
const axios = require('axios');
const logger = require('../utils/logger');

const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:8000';

/**
 * GET /api/analytics/expiry-risk
 * Aggregates active inventory batches and 30-day sales, forwards to AI worker for risk analysis.
 */
async function getExpiryRisk(req, res) {
  try {
    // Fetch all active inventory batches with product info
    const batchesResult = await pool.query(
      `SELECT
         ib.id AS batch_id,
         ib.product_id,
         ib.batch_number,
         ib.quantity_remaining,
         ib.cost_price,
         ib.expiry_date,
         ib.risk_level,
         p.sku,
         p.name AS product_name,
         p.category
       FROM inventory_batches ib
       JOIN products p ON p.id = ib.product_id
       WHERE ib.quantity_remaining > 0
       ORDER BY ib.expiry_date ASC`
    );

    // Fetch sales from the last 30 days
    const salesResult = await pool.query(
      `SELECT
         sl.product_id,
         sl.quantity_sold,
         sl.sale_price,
         sl.sold_at
       FROM sales_log sl
       WHERE sl.sold_at >= NOW() - INTERVAL '30 days'
       ORDER BY sl.sold_at DESC`
    );

    const payload = {
      batches: batchesResult.rows,
      sales: salesResult.rows,
    };

    if (batchesResult.rowCount === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No active inventory batches found',
      });
    }

    // Forward to AI worker for risk prediction
    let riskAnalysis;
    try {
      const aiResponse = await axios.post(`${AI_WORKER_URL}/predict-expiry`, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });
      riskAnalysis = aiResponse.data;
    } catch (aiErr) {
      logger.error('AI worker prediction failed, returning raw data', {
        error: aiErr.message,
        url: `${AI_WORKER_URL}/predict-expiry`,
      });

      // Graceful degradation — return raw data without risk analysis
      return res.status(200).json({
        success: true,
        data: batchesResult.rows,
        sales_summary: {
          total_records: salesResult.rowCount,
          period: '30 days',
        },
        ai_status: 'unavailable',
        message: 'Risk analysis unavailable — AI worker offline. Displaying raw inventory data.',
      });
    }

    // Update risk levels in the database
    if (riskAnalysis.predictions && Array.isArray(riskAnalysis.predictions)) {
      for (const prediction of riskAnalysis.predictions) {
        await pool.query(
          'UPDATE inventory_batches SET risk_level = $1 WHERE id = $2',
          [prediction.risk_level, prediction.batch_id]
        );
      }
    }

    logger.info('Expiry risk analysis completed', {
      batches_analyzed: batchesResult.rowCount,
      sales_records: salesResult.rowCount,
    });

    return res.status(200).json({
      success: true,
      data: riskAnalysis.predictions || riskAnalysis,
      sales_summary: {
        total_records: salesResult.rowCount,
        period: '30 days',
      },
      ai_status: 'active',
    });
  } catch (err) {
    logger.error('Failed to compute expiry risk analysis', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error during risk analysis' });
  }
}

module.exports = { getExpiryRisk };
