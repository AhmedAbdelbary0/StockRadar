'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const AI_WORKER_URL = process.env.AI_WORKER_URL || 'http://localhost:8000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

/**
 * POST /api/mitigation/generate
 * ------------------------------
 * Proxies a mitigation generation request to the AI worker.
 * Only reachable by authenticated MANAGER users (enforced at the route level).
 * Appends the X-Internal-Secret header so the AI worker can verify the request
 * originates from this trusted orchestrator and not from the public internet.
 */
async function generateMitigation(req, res) {
  try {
    const response = await axios.post(
      `${AI_WORKER_URL}/mitigate-risk`,
      req.body,
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
      }
    );

    logger.info('Mitigation strategy generated via proxy', {
      sku: req.body.sku,
      batch_id: req.body.batch_id,
      manager_id: req.user.id,
    });

    return res.status(200).json(response.data);
  } catch (err) {
    if (err.response) {
      logger.error('AI worker returned an error during mitigation', {
        status: err.response.status,
        data: err.response.data,
      });
      return res.status(err.response.status).json({
        success: false,
        error: err.response.data?.detail || 'AI worker returned an error.',
      });
    }
    logger.error('Mitigation proxy request failed', { error: err.message });
    return res.status(503).json({
      success: false,
      error: 'AI worker is currently unavailable. Please try again shortly.',
    });
  }
}

module.exports = { generateMitigation };
